"""Explicit public allowlist. Never expose Person, proposals or funding contracts."""
from rest_framework import serializers
from .models import Project


class PublicProjectSerializer(serializers.ModelSerializer):
    domain_label = serializers.CharField(source="get_domain_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    has_approved_funding = serializers.BooleanField(read_only=True)

    class Meta:
        model = Project
        fields = (
            "id", "reference_number", "title", "description", "problem_statement",
            "solution", "conclusion", "objectives", "expected_results", "domain",
            "domain_label", "project_type", "sector", "target_population", "location",
            "start_date", "end_date", "total_budget", "requested_amount",
            "own_contribution", "currency", "status", "status_label", "posted_at",
            "progress_percentage", "completed_at", "has_approved_funding",
        )
        read_only_fields = fields
