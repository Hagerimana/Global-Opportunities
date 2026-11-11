"""Ordered-workflow serializers; status and ownership are server-controlled."""
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework import serializers

from apps.professional_profiles.models import ProfessionalDomain
from .models import Project
from .workflow_services import description_and_funding_issues
from .serializers import ProjectSerializer

class WorkflowStateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    reference_number = serializers.CharField()
    status = serializers.CharField()
    current_step = serializers.CharField()
    steps = serializers.ListField(child=serializers.DictField())
    pdf = serializers.DictField()
    issues = serializers.DictField()


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "domain")
        read_only_fields = ("id",)

    def validate_domain(self, value):
        if value not in ProfessionalDomain.values:
            raise serializers.ValidationError(_("Select a supported project domain."))
        return value


class DescriptionFundingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = (
            "title", "problem_statement", "solution", "conclusion",
            "objectives", "expected_results", "target_population", "location",
            "start_date", "end_date", "total_budget", "requested_amount",
            "own_contribution", "currency",
        )

    def validate_currency(self, value):
        value = (value or "").strip().upper()
        if len(value) != 3 or not value.isascii() or not value.isalpha():
            raise serializers.ValidationError(
                _("Enter a three-letter currency code.")
            )
        return value

    def validate(self, attrs):
        data = {**{
            field: getattr(self.instance, field)
            for field in self.Meta.fields
        }, **attrs} if self.instance else attrs
        if data.get("start_date") and data.get("end_date") and data["start_date"] > data["end_date"]:
            raise serializers.ValidationError(
                {"end_date": _("Must be on or after the start date.")}
            )
        amounts = [data.get(field) for field in ("total_budget", "requested_amount", "own_contribution")]
        if all(value is not None for value in amounts) and amounts[1] + amounts[2] != amounts[0]:
            raise serializers.ValidationError({
                "total_budget": _(
                    "Total budget must equal requested funding plus own "
                    "contribution."
                )
            })
        return attrs


class ReviewSerializer(serializers.ModelSerializer):
    workflow = serializers.SerializerMethodField()
    issues = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id", "reference_number", "title", "description", "problem_statement",
            "solution", "conclusion", "objectives", "expected_results", "domain",
            "target_population", "location", "start_date", "end_date",
            "total_budget", "requested_amount", "own_contribution", "currency",
            "status", "workflow", "issues",
        )
        read_only_fields = fields

    def get_workflow(self, obj):
        from .workflow_services import workflow_state
        return workflow_state(obj, self.context["request"].user)

    def get_issues(self, obj):
        return description_and_funding_issues(obj)


class ReviewUpdateSerializer(ProjectSerializer):
    """Edit the information collected by the posting workflow."""

    class Meta(ProjectSerializer.Meta):
        fields = (
            "title",
            "problem_statement",
            "solution",
            "conclusion",
            "objectives",
            "expected_results",
            "domain",
            "target_population",
            "location",
            "start_date",
            "end_date",
            "total_budget",
            "requested_amount",
            "own_contribution",
            "currency",
        )
        read_only_fields = ()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}

        for field in self.Meta.fields:
            value = attrs.get(
                field,
                getattr(self.instance, field, None),
            )

            if value is None or (isinstance(value, str) and not value.strip()):
                errors[field] = _("This field cannot be empty.")

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
