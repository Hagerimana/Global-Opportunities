"""Import Burundi colline/quartier reference data from the supplied law PDF.

The PDF is scanned/OCR text. This importer preserves the source page and
marks rows as OCR-sourced. Review the imported rows before relying on them
for production decisions.
"""

import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.locations.models import Commune, Locality, Province

PROVINCE_PATTERN = re.compile(
    r"^(?:I|II|III|IV|V)\.\s+PROVINCE DE\s+(.+?)\s*$",
    re.MULTILINE,
)

COMMUNE_PATTERN = re.compile(
    r"(\d+)\.\s+([A-ZÀ-Ý][A-ZÀ-Ý\'\- ]+)\s+\2(?=\s|$)"
)

ZONE_PATTERN = re.compile(
    r"(\d+)\.\s+([A-Za-zÀ-ÿ\'\- ]+?)\s+(?=1\.\s)"
)

LOCALITY_SPLIT = re.compile(r"br(?=\d+\.)")
LOCALITY_PATTERN = re.compile(r"(\d+)\.\s*([^\n]+)")


def normalize_name(value):
    return re.sub(r"\s+", " ", value).strip()


def classification(value):
    cleaned = normalize_name(value)
    if cleaned.lower().startswith("quartier"):
        return Locality.Kind.QUARTIER, normalize_name(cleaned[8:])
    return Locality.Kind.UNCONFIRMED, cleaned


class Command(BaseCommand):
    help = (
        "Import colline/quartier rows from the official Burundi law PDF. "
        "Existing rows are preserved; imported rows are marked as OCR-sourced."
    )

    def add_arguments(self, parser):
        parser.add_argument("pdf_path", type=str)
        parser.add_argument(
            "--mark-verified",
            action="store_true",
            help="Mark imported rows as verified after you review the OCR output.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be imported without writing to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        pdf_path = Path(options["pdf_path"])
        if not pdf_path.exists():
            raise CommandError(f"PDF not found: {pdf_path}")

        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise CommandError("Install pypdf first: python -m pip install pypdf") from exc

        reader = PdfReader(str(pdf_path))
        pages = [(index + 1, page.extract_text() or "") for index, page in enumerate(reader.pages)]
        full_text = "\n".join(text for _, text in pages)

        province_matches = list(PROVINCE_PATTERN.finditer(full_text))
        if not province_matches:
            raise CommandError("No province sections were recognized in the PDF text.")

        created = 0
        skipped = 0
        reviewed_localities = 0

        for province_index, province_match in enumerate(province_matches):
            province_name = normalize_name(province_match.group(1))
            start = province_match.end()
            end = (
                province_matches[province_index + 1].start()
                if province_index + 1 < len(province_matches)
                else len(full_text)
            )
            province_text = full_text[start:end]

            try:
                province = Province.objects.get(
                    name__iexact=province_name,
                    country__code="BI",
                )
            except Province.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"Province not found in reference data: {province_name}"
                ))
                continue

            commune_matches = list(COMMUNE_PATTERN.finditer(province_text))

            for commune_index, commune_match in enumerate(commune_matches):
                commune_name = normalize_name(commune_match.group(2))
                commune_start = commune_match.end()
                commune_end = (
                    commune_matches[commune_index + 1].start()
                    if commune_index + 1 < len(commune_matches)
                    else len(province_text)
                )
                commune_text = province_text[commune_start:commune_end]

                try:
                    commune = Commune.objects.get(
                        province=province,
                        name__iexact=commune_name,
                    )
                except Commune.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f"Commune not found: {commune_name} ({province_name})"
                    ))
                    continue

                zone_matches = list(ZONE_PATTERN.finditer(commune_text))

                for zone_index, zone_match in enumerate(zone_matches):
                    zone_name = normalize_name(zone_match.group(2))
                    locality_start = zone_match.end()
                    locality_end = (
                        zone_matches[zone_index + 1].start()
                        if zone_index + 1 < len(zone_matches)
                        else len(commune_text)
                    )
                    locality_text = LOCALITY_SPLIT.sub(
                        "\n",
                        commune_text[locality_start:locality_end],
                    )

                    for locality_match in LOCALITY_PATTERN.finditer(locality_text):
                        raw_name = locality_match.group(2)
                        kind, name = classification(raw_name)

                        if not name or name.lower() in {"total", "zones", "collines"}:
                            continue

                        page_number = None
                        offset = province_match.start() + commune_match.start() + zone_match.start()
                        for page_number_candidate, page_text in pages:
                            if page_text and normalize_name(page_text).find(name) >= 0:
                                page_number = page_number_candidate
                                break

                        if options["dry_run"]:
                            reviewed_localities += 1
                            continue

                        _, was_created = Locality.objects.get_or_create(
                            commune=commune,
                            source_zone=zone_name,
                            name=name,
                            kind=kind,
                            defaults={
                                "source_reference": (
                                    "LOI 1/05 du 16 mars 2023 - OCR import"
                                ),
                                "source_page": page_number,
                                "is_verified": bool(options["mark_verified"]),
                                "is_active": True,
                            },
                        )

                        created += int(was_created)
                        reviewed_localities += 1

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(
                f"Dry run: recognized {reviewed_localities} locality rows. "
                "No database rows were created."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"Import finished: {created} new localities created; "
            f"{reviewed_localities} locality rows processed."
        ))
        self.stdout.write(
            "Rows imported from OCR are marked with their source page. "
            "Use --mark-verified only after reviewing the imported names."
        )
