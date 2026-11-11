"""Safe representations and inputs for project Expert invitations."""

from collections.abc import Mapping

from rest_framework import serializers

from apps.professional_profiles.models import ProfessionalProfile

from .models import ProjectExpertInvitation


class StrictInputSerializer(serializers.Serializer):
    """Reject fields that callers are not allowed to control."""

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            unexpected = set(data) - set(self.fields)

            if unexpected:
                raise serializers.ValidationError(
                    {
                        str(field): ["This field is not allowed."]
                        for field in sorted(unexpected, key=str)
                    }
                )

        return super().to_internal_value(data)


class ExpertDirectorySerializer(serializers.ModelSerializer):
    """Basic approved-Expert information, without private contact data."""

    user_id = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(
        source="user.person.first_name",
        read_only=True,
    )
    last_name = serializers.CharField(
        source="user.person.last_name",
        read_only=True,
    )
    domain_label = serializers.CharField(
        source="get_domain_display",
        read_only=True,
    )

    class Meta:
        model = ProfessionalProfile
        fields = (
            "user_id",
            "first_name",
            "last_name",
            "domain",
            "domain_label",
            "professional_title",
            "biography",
            "years_experience",
            "availability",
        )
        read_only_fields = fields


class CreateExpertInvitationSerializer(StrictInputSerializer):
    project_id = serializers.IntegerField(min_value=1)
    expert_user_id = serializers.IntegerField(min_value=1)

    message = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=5000,
    )


class RespondToExpertInvitationSerializer(StrictInputSerializer):
    accept = serializers.BooleanField()


class EmptyInvitationActionSerializer(StrictInputSerializer):
    """Actions such as cancellation accept no writable fields."""


class ExpertInvitationSerializer(serializers.ModelSerializer):
    """Invitation metadata, without project files or bank information."""

    project_id = serializers.IntegerField(read_only=True)
    project_title = serializers.CharField(
        source="project.title",
        read_only=True,
    )
    project_reference = serializers.CharField(
        source="project.reference_number",
        read_only=True,
    )

    expert_user_id = serializers.IntegerField(read_only=True)
    invited_by_user_id = serializers.IntegerField(read_only=True)

    expert_name = serializers.SerializerMethodField()
    applicant_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectExpertInvitation
        fields = (
            "id",
            "project_id",
            "project_title",
            "project_reference",
            "expert_user_id",
            "expert_name",
            "invited_by_user_id",
            "applicant_name",
            "message",
            "status",
            "sent_at",
            "expires_at",
            "responded_at",
            "cancelled_at",
            "access_revoked_at",
            "access_revocation_reason",
        )
        read_only_fields = fields

    @staticmethod
    def _person_name(user):
        if user.person_id is None:
            return ""

        person = user.person

        return f"{person.first_name} {person.last_name}".strip()

    def get_expert_name(self, obj):
        return self._person_name(obj.expert_user)

    def get_applicant_name(self, obj):
        return self._person_name(obj.invited_by_user)
