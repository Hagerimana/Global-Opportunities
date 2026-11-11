"""Serializers for the applications app."""

from rest_framework import serializers

from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    """Converts an Application to and from JSON."""

    class Meta:
        model = Application
        fields = "__all__"
        # `status` is read-only on purpose: an applicant may not promote their
        # own application straight to SELECTED. Status only moves through the
        # `submit` action and through evaluation and decision endpoints owned by
        # staff. `submitted_at` is stamped server-side by that same action.
        read_only_fields = ["submitted_by_user", "submitted_at", "status"]
