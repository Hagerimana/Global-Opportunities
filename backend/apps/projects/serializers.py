"""Private project representations for the creating account."""

from rest_framework import serializers
from django.utils.translation import gettext as _

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    """Read and edit project drafts without client-controlled status."""

    class Meta:
        model = Project

        fields = (
            "id",
            "reference_number",
            "title",
            "description",
            "problem_statement",
            "solution",
            "conclusion",
            "objectives",
            "expected_results",
            "domain",
            "project_type",
            "sector",
            "target_population",
            "location",
            "start_date",
            "end_date",
            "total_budget",
            "requested_amount",
            "own_contribution",
            "currency",
            "status",
            "verified_at",
            "posted_at",
            "created_by_user",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "reference_number",
            "status",
            "verified_at",
            "posted_at",
            "created_by_user",
            "created_at",
            "updated_at",
        )

    def validate_currency(self, value):
        value = value.strip().upper()

        if len(value) != 3 or not value.isascii() or not value.isalpha():
            raise serializers.ValidationError(
                _("Enter a three-letter currency code.")
            )

        return value

    def validate(self, attrs):
        def current_value(field):
            if field in attrs:
                return attrs[field]

            if self.instance is not None:
                return getattr(self.instance, field)

            return None

        start = current_value("start_date")
        end = current_value("end_date")

        if start is not None and end is not None and start > end:
            raise serializers.ValidationError(
                {"end_date": _("Must be on or after the project start date.")}
            )

        total = current_value("total_budget")
        requested = current_value("requested_amount")
        contribution = current_value("own_contribution")

        if all(value is not None for value in (total, requested, contribution)):
            if requested + contribution != total:
                raise serializers.ValidationError(
                    {
                        "total_budget": (
                            _(
                                "Must equal requested funding plus own "
                                "contribution."
                            )
                        )
                    }
                )

        return attrs
