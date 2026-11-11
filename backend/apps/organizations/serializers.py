"""Validation for organization details submitted during registration."""

from collections.abc import Mapping

from rest_framework import serializers
from django.utils.translation import gettext as _

from .models import Organization


class OrganizationRegistrationSerializer(serializers.Serializer):
    """
    Validate organization details before email verification.

    Account verification creates the organization and assigns its
    login account on the server.
    """

    name = serializers.CharField(
        max_length=255,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    organization_type = serializers.ChoiceField(
        choices=Organization.Type.choices,
        required=True,
    )

    registration_number = serializers.CharField(
        max_length=100,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    email = serializers.EmailField(
        max_length=254,
        required=True,
        allow_blank=False,
    )

    phone = serializers.CharField(
        max_length=50,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    address = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    province = serializers.CharField(
        max_length=100,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    commune = serializers.CharField(
        max_length=100,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )

    website = serializers.URLField(
        max_length=200,
        required=False,
        allow_blank=True,
        default="",
    )

    def to_internal_value(self, data):
        """Reject fields that public registration must not set."""

        if isinstance(data, Mapping):
            unknown_fields = set(data) - set(self.fields)

            if unknown_fields:
                raise serializers.ValidationError(
                    {
                        str(field): [
                            _(
                                "This field is not allowed in organization "
                                "registration."
                            )
                        ]
                        for field in sorted(unknown_fields, key=str)
                    }
                )

        return super().to_internal_value(data)

    def validate_email(self, value):
        """Normalize the organization's contact email."""

        return value.strip().lower()

    def validate_registration_number(self, value):
        """Reject a registration number already used by an organization."""

        if Organization.objects.filter(
            registration_number__iexact=value,
        ).exists():
            raise serializers.ValidationError(
                _(
                    "An organization with this registration number already "
                    "exists."
                )
            )

        return value
