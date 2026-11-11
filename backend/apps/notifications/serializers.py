"""Safe notification-inbox representations."""

from rest_framework import serializers
from django.utils.translation import gettext

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "title",
            "message",
            "target_type",
            "target_id",
            "is_read",
            "created_at",
            "read_at",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        # Titles and bodies are stored in English (the catalogue's msgid
        # language) so the recipient reads them in their own language, not the
        # language of the person who triggered the event.
        data = super().to_representation(instance)
        data["title"] = gettext(instance.title)
        data["message"] = gettext(instance.message)
        return data
