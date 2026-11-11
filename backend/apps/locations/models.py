"""Country and administrative reference data.

Zones are retained only as source metadata on localities.
They are not a separate selector in the applicant form.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class Country(models.Model):
    # ISO 3166-1 alpha-2 code, for example BI.
    code = models.CharField(max_length=2, primary_key=True)
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Province(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="provinces",
    )

    # Internal application identifier, not an official government code.
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["country", "name"],
                name="location_unique_province_name",
            ),
        ]

    def __str__(self):
        return self.name


class Commune(models.Model):
    province = models.ForeignKey(
        Province,
        on_delete=models.PROTECT,
        related_name="communes",
    )

    # Internal application identifier, not an official government code.
    code = models.CharField(max_length=60, unique=True)
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["province", "name"],
                name="location_unique_commune_name",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.province.name}"


class Locality(models.Model):
    """A colline or quartier belonging to a commune."""

    class Kind(models.TextChoices):
        COLLINE = "COLLINE", _("Colline")
        QUARTIER = "QUARTIER", _("Quartier")
        UNCONFIRMED = "UNCONFIRMED", _("Classification not verified")

    commune = models.ForeignKey(
        Commune,
        on_delete=models.PROTECT,
        related_name="localities",
    )

    name = models.CharField(max_length=150)

    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.UNCONFIRMED,
    )

    # Retained to distinguish same-named places within a commune.
    # No zone selector is required in the frontend.
    source_zone = models.CharField(max_length=150, blank=True)

    source_reference = models.CharField(
        max_length=255,
        blank=True,
    )
    source_page = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    # Unverified OCR/import entries are not exposed in dropdowns.
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "source_zone", "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["commune", "source_zone", "name", "kind"],
                name="location_unique_locality_context",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.commune.name}"
