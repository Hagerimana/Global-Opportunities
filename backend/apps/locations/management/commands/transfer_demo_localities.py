"""Transfer reviewed location catalogue only; never users or private data."""
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.locations.models import Commune, Locality

class Command(BaseCommand):
    help = "Export/import active, reviewed locality reference using commune codes."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--export", dest="export_path")
        group.add_argument("--import-file", dest="import_path")

    def handle(self, *args, **options):
        if options["export_path"]:
            rows = list(Locality.objects.filter(
                is_active=True, is_verified=True,
                commune__is_active=True, commune__province__is_active=True,
                commune__province__country_id="BI",
            ).order_by("commune__code", "name", "pk").values(
                "commune__code", "source_zone", "name", "kind",
                "source_reference", "source_page",
            ))
            if not rows:
                raise CommandError("No active reviewed localities exist. Review catalogue rows first; do not mark OCR output verified automatically.")
            path = Path(options["export_path"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"format": 1, "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Exported {len(rows)} reviewed locality records to {path}. No personal data included."))
            return
        path = Path(options["import_path"])
        if not path.is_file():
            raise CommandError(f"Reviewed catalogue missing: {path}. Export it from the existing database before building the image.")
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            rows = payload["rows"]
            if payload.get("format") != 1 or not isinstance(rows, list) or not rows:
                raise ValueError("Empty or unsupported catalogue")
        except (ValueError, KeyError, TypeError) as exc:
            raise CommandError(f"Invalid catalogue: {exc}") from exc
        created_count = 0
        with transaction.atomic():
            for row in rows:
                try:
                    commune = Commune.objects.get(code=row["commune__code"], province__country_id="BI")
                    obj, created = Locality.objects.get_or_create(
                        commune=commune, source_zone=row["source_zone"], name=row["name"], kind=row["kind"],
                        defaults={"source_reference": row["source_reference"], "source_page": row["source_page"], "is_active": True, "is_verified": True},
                    )
                    if created:
                        obj.full_clean()
                    elif not obj.is_active or not obj.is_verified:
                        raise CommandError(f"Existing inactive/unverified locality requires review: {obj.pk}. Not overwritten.")
                    created_count += int(created)
                except (KeyError, Commune.DoesNotExist) as exc:
                    raise CommandError(f"Catalogue entry cannot be matched: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(f"Locality catalogue loaded: {len(rows)} records checked, {created_count} created; existing records preserved."))
