"""Completion checks shared by the profile API and future posting service."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from apps.locations.models import Country
from .models import Person, validate_interests
from .validators import validate_minimum_age

def personal_information_issues(person, account):
    issues = {}
    required = (
        "first_name", "last_name", "date_of_birth", "gender", "phone",
        "nationality", "country_of_residence", "address", "bank_name",
        "bank_account_number",
    )
    for field in required:
        value = getattr(person, field)
        if value is None or (isinstance(value, str) and not value.strip()):
            issues[field] = _("This information is required before posting.")

    if not account.email:
        issues["email"] = _("The account must have a login email.")

    if person.date_of_birth:
        try:
            validate_minimum_age(person.date_of_birth)
        except DjangoValidationError as exc:
            issues["date_of_birth"] = " ".join(exc.messages)

    if person.gender and person.gender not in Person.Gender.values:
        issues["gender"] = _("Select Male or Female.")

    for field in ("nationality", "country_of_residence"):
        value = getattr(person, field)
        if value and not Country.objects.filter(code=value, is_active=True).exists():
            issues[field] = _("Select a country from the current catalogue.")

    try:
        validate_interests(person.interests)
        if not person.interests:
            issues["interests"] = _("Select at least one interest.")
    except DjangoValidationError:
        issues["interests"] = _("Select distinct supported interests.")

    if person.country_of_residence == "BI":
        province = person.residence_province
        commune = person.residence_commune
        locality = person.residence_locality

        if not province:
            issues["province_id"] = _("Select a province.")
        elif not (
            province.is_active and province.country_id == "BI"
            and province.country.is_active
        ):
            issues["province_id"] = _("Select an active Burundi province.")

        if not commune:
            issues["commune_id"] = _("Select a commune.")
        elif not (
            commune.is_active and province
            and commune.province_id == province.pk
        ):
            issues["commune_id"] = _("Select a commune in the selected province.")

        if not locality:
            issues["locality_id"] = _("Select a verified colline or quartier.")
        elif not (
            locality.is_active and locality.is_verified and commune
            and locality.commune_id == commune.pk
        ):
            issues["locality_id"] = _(
                "Select a verified locality in the selected commune."
            )
    elif any((
        person.residence_province_id,
        person.residence_commune_id,
        person.residence_locality_id,
    )):
        issues["country_of_residence"] = _(
            "Burundi location links must be cleared."
        )

    return issues


def assert_personal_information_ready(person, account):
    issues = personal_information_issues(person, account)
    if issues:
        raise ValidationError({"personal_information": issues})
