"""Natural-person identity, contact, and private applicant information."""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from .validators import validate_minimum_age


class Interest(models.TextChoices):
    TECHNOLOGY = "TECHNOLOGY", _("Technology")
    MUSIC = "MUSIC", _("Music")
    SPORT = "SPORT", _("Sport")
    AGRICULTURE = "AGRICULTURE", _("Agriculture")
    BUSINESS = "BUSINESS", _("Business")
    EDUCATION = "EDUCATION", _("Education")
    HEALTH = "HEALTH", _("Health")
    ENVIRONMENT = "ENVIRONMENT", _("Environment")
    ARTS_CULTURE = "ARTS_CULTURE", _("Arts and culture")
    SCIENCE_RESEARCH = "SCIENCE_RESEARCH", _("Science and research")
    COMMUNITY_DEVELOPMENT = (
        "COMMUNITY_DEVELOPMENT",
        _("Community development"),
    )
    OTHER = "OTHER", _("Other")


class Gender(models.TextChoices):
    MALE = "male", _("Male")
    FEMALE = "female", _("Female")


def validate_interests(value):
    """Require a list of distinct supported interest codes."""

    if not isinstance(value, list):
        raise ValidationError(_("Interests must be provided as a list."))

    if any(not isinstance(item, str) or item not in Interest.values for item in value):
        raise ValidationError(_("One or more interests are not supported."))

    if len(value) != len(set(value)):
        raise ValidationError(
            _("Do not select the same interest more than once.")
        )


class Person(models.Model):
    """A natural person, independent of a login account."""

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    # Names.
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)

    # Civil identity.
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        validators=[validate_minimum_age],
    )

    gender = models.CharField(
        max_length=40,
        choices=Gender.choices,
        blank=True,
    )

    # Keep all your remaining fields below this point.

    # Contact.
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(unique=True)

    # Preserve the existing field and existing values.
    # The upcoming country API/serializer will normalize new selections.
    nationality = models.CharField(max_length=100, blank=True)

    # ISO alpha-2 code for the residential country, e.g. BI.
    # Separate from nationality.
    country_of_residence = models.CharField(
        max_length=2,
        blank=True,
    )

    # Residential address.
    # The upcoming location service will validate selections against
    # the Burundi reference dataset.
    address = models.TextField(blank=True)
    province = models.CharField(max_length=150, blank=True)
    commune = models.CharField(max_length=150, blank=True)
    colline = models.CharField(max_length=150, blank=True)

    residence_province = models.ForeignKey(
        "locations.Province",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="resident_persons",
    )

    residence_commune = models.ForeignKey(
        "locations.Commune",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="resident_persons",
    )

    residence_locality = models.ForeignKey(
        "locations.Locality",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="resident_persons",
    )

    # Private financial information.
    # Do not include these fields in public project responses.
    bank_name = models.CharField(
        max_length=255,
        blank=True,
    )
    bank_account_number = models.CharField(
        max_length=100,
        blank=True,
    )

    # Store codes, for example ["TECHNOLOGY", "MUSIC"].
    interests = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_interests],
    )

    # Excluded from the project-personal-information wizard.
    profile_photo = models.ImageField(
        upload_to="profiles/",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
