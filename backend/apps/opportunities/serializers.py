"""Serializes the generic Opportunity record for the discovery API.

The list and detail endpoints share one serializer, so a card rendered from the
list view has exactly the fields the detail view will show.
"""

from rest_framework import serializers

from django.utils.translation import gettext as _

from .models import Opportunity


class OpportunitySerializer(serializers.ModelSerializer):
    """Converts an Opportunity to and from JSON.

    `fields = "__all__"` exposes every concrete column on the base table. The
    type-specific fields (amounts, reference numbers, evaluation dates) live on
    the FundingOpportunity and CallForProjects child rows and are therefore not
    included here; a funding-specific serializer would be needed to read them.
    """

    class Meta:
        model = Opportunity
        fields = "__all__"
        # Server-owned fields: the acting user is taken from the request, and
        # timestamps are maintained by the database.
        read_only_fields = ["created_by_user", "created_at", "updated_at"]

    def validate(self, attrs):
        """Enforce the application window on both create and update.

        On PATCH only one of the two dates may be supplied, so each falls back to
        the value already stored on the instance. This mirrors the model-level
        `clean()` check, which DRF does not call on its own.
        """
        start = attrs.get(
            "application_start_date",
            getattr(self.instance, "application_start_date", None),
        )
        end = attrs.get(
            "application_deadline",
            getattr(self.instance, "application_deadline", None),
        )
        if start and end and start > end:
            raise serializers.ValidationError(
                {
                    "application_deadline": _(
                        "Must be on or after application start date."
                    )
                }
            )
        return attrs
