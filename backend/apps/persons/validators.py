"""Shared personal-information validation."""

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext as _

MINIMUM_AGE = 16


def age_in_years(date_of_birth, today=None):
    today = today or timezone.localdate()

    return (
        today.year
        - date_of_birth.year
        - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    )


def validate_minimum_age(date_of_birth):
    if date_of_birth is None:
        return

    today = timezone.localdate()

    if date_of_birth > today:
        raise ValidationError(_("Date of birth cannot be in the future."))

    if age_in_years(date_of_birth, today) < MINIMUM_AGE:
        raise ValidationError(_("You must be at least 16 years old."))
