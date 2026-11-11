"""Seed countries and the Burundi province/commune reference."""

import pycountry

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.locations.models import Country, Province, Commune

# From Articles 4–5 of the supplied 16 March 2023 law.
# Codes generated below are internal application identifiers.
BURUNDI_DIVISIONS = [
    (
        "BUHUMUZA",
        [
            "Butaganzwa",
            "Butihinda",
            "Cankuzo",
            "Gisagara",
            "Gisuru",
            "Muyinga",
            "Ruyigi",
        ],
    ),
    (
        "BUJUMBURA",
        [
            "Bubanza",
            "Bukinanyana",
            "Cibitoke",
            "Isare",
            "Mpanda",
            "Mugere",
            "Mugina",
            "Muhuta",
            "Mukaza",
            "Ntahangwa",
            "Rwibaga",
        ],
    ),
    (
        "BURUNGA",
        [
            "Bururi",
            "Makamba",
            "Matana",
            "Musongati",
            "Nyanza",
            "Rumonge",
            "Rutana",
        ],
    ),
    (
        "BUTANYERERA",
        [
            "Busoni",
            "Kayanza",
            "Kiremba",
            "Kirundo",
            "Matongo",
            "Muhanga",
            "Ngozi",
            "Tangara",
        ],
    ),
    (
        "GITEGA",
        [
            "Bugendana",
            "Gishubi",
            "Gitega",
            "Karusi",
            "Kiganda",
            "Muramvya",
            "Mwaro",
            "Nyabihanga",
            "Shombo",
        ],
    ),
]


class Command(BaseCommand):
    help = (
        "Create country references and Burundi's five provinces "
        "and 42 communes without overwriting existing records."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created_countries = 0
        created_provinces = 0
        created_communes = 0

        for item in pycountry.countries:
            display_name = getattr(item, "common_name", item.name)

            _, created = Country.objects.get_or_create(
                code=item.alpha_2,
                defaults={
                    "name": display_name,
                    "is_active": True,
                },
            )

            created_countries += int(created)

        burundi = Country.objects.get(code="BI")

        for province_number, (name, communes) in enumerate(
            BURUNDI_DIVISIONS,
            start=1,
        ):
            province_code = f"BI-P{province_number:02d}"

            province, created = Province.objects.get_or_create(
                code=province_code,
                defaults={
                    "country": burundi,
                    "name": name,
                    "is_active": True,
                },
            )

            created_provinces += int(created)

            for commune_number, commune_name in enumerate(
                communes,
                start=1,
            ):
                _, created = Commune.objects.get_or_create(
                    code=(f"{province_code}-C{commune_number:02d}"),
                    defaults={
                        "province": province,
                        "name": commune_name,
                        "is_active": True,
                    },
                )

                created_communes += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created_countries} countries/territories, "
                f"{created_provinces} provinces, "
                f"and {created_communes} communes."
            )
        )

        self.stdout.write("Existing records were preserved.")

        self.stdout.write("Colline/quarter data has not been imported by this command.")
