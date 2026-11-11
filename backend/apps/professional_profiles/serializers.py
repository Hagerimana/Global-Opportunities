"""Validation and representations for professional-profile drafts."""

from collections.abc import Mapping

from rest_framework import serializers
from django.utils.translation import gettext as _

from .models import (
    ProfileType,
    ProfessionalDomain,
    ProfessionalProfileRequest,
    ProfessionalProfileRequestRequirement,
)


class StrictSerializer(serializers.Serializer):
    """Reject unexpected input instead of silently ignoring it."""

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            unexpected = set(data) - set(self.fields)

            if unexpected:
                raise serializers.ValidationError(
                    {
                        str(field): [_("This field is not allowed.")]
                        for field in sorted(unexpected, key=str)
                    }
                )

        return super().to_internal_value(data)


class ProfileDraftFieldsSerializer(StrictSerializer):
    domain = serializers.ChoiceField(
        choices=ProfessionalDomain.choices,
        required=False,
        allow_blank=True,
    )

    motivation = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    qualifications = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    biography = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    years_experience = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=32767,
    )

    professional_title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    teaching_methodology = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class ProfileDraftCreateSerializer(ProfileDraftFieldsSerializer):
    requested_role = serializers.ChoiceField(
        choices=ProfileType.choices,
    )


class RequestRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalProfileRequestRequirement
        fields = (
            "id",
            "configuration_snapshot",
            "applicability",
            "applicability_reason",
        )
        read_only_fields = fields


class ProfileRequestSerializer(serializers.ModelSerializer):
    document_requirements = RequestRequirementSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ProfessionalProfileRequest
        fields = (
            "id",
            "request_type",
            "requested_role",
            "previous_profile_id",
            "domain",
            "motivation",
            "qualifications",
            "biography",
            "years_experience",
            "professional_title",
            "teaching_methodology",
            "status",
            "review_comment",
            "development_auto_approved",
            "created_at",
            "updated_at",
            "document_requirements",
        )
        read_only_fields = fields
