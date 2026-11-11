"""Private conversation representations and controlled action inputs."""

from collections.abc import Mapping

from django.conf import settings
from django.utils.translation import gettext as _
from rest_framework import serializers

from .models import Conversation, Message


class StrictInputSerializer(serializers.Serializer):
    """Reject unexpected fields instead of silently ignoring them."""

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


class OpenConversationSerializer(StrictInputSerializer):
    invitation_id = serializers.IntegerField(min_value=1)


class SendMessageSerializer(StrictInputSerializer):
    client_message_id = serializers.UUIDField()

    subject = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=255,
    )

    content = serializers.CharField(
        allow_blank=False,
    )

    def validate_content(self, value):
        limit = int(getattr(settings, "PRIVATE_MESSAGE_MAX_LENGTH", 10000))

        if len(value) > limit:
            raise serializers.ValidationError(
                _("Use no more than {} characters.").format(limit)
            )

        return value


class MarkMessagesReadSerializer(StrictInputSerializer):
    through_message_id = serializers.IntegerField(min_value=1)


class ConversationInboxStateSerializer(StrictInputSerializer):
    archived = serializers.BooleanField(required=False)
    hidden = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(_("Provide archived or hidden."))

        return attrs


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation_id",
            "sender_user_id",
            "recipient_user_id",
            "subject",
            "content",
            "client_message_id",
            "status",
            "sent_at",
            "delivered_at",
            "read_at",
            "is_mine",
        )
        read_only_fields = fields

    def get_is_mine(self, obj):
        return obj.sender_user_id == self.context["request"].user.pk


class ConversationSerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(
        source="invitation.project_id",
        read_only=True,
    )

    project_title = serializers.CharField(
        source="invitation.project.title",
        read_only=True,
    )

    project_reference = serializers.CharField(
        source="invitation.project.reference_number",
        read_only=True,
    )

    invitation_status = serializers.CharField(
        source="invitation.status",
        read_only=True,
    )

    unread_count = serializers.IntegerField(read_only=True)

    other_participant = serializers.SerializerMethodField()
    inbox_state = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "invitation_id",
            "project_id",
            "project_title",
            "project_reference",
            "invitation_status",
            "subject",
            "other_participant",
            "unread_count",
            "inbox_state",
            "is_closed",
            "closed_at",
            "closure_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_other_participant(self, obj):
        user_id = self.context["request"].user.pk

        other = obj.expert_user if obj.owner_user_id == user_id else obj.owner_user

        name = ""

        if other.person_id is not None:
            name = (f"{other.person.first_name} " f"{other.person.last_name}").strip()

        return {
            "id": other.pk,
            "name": name,
            "project_role": (
                "EXPERT" if other.pk == obj.expert_user_id else "PROJECT_OWNER"
            ),
        }

    def get_inbox_state(self, obj):
        states = getattr(obj, "viewer_states", [])

        if not states:
            return {
                "archived_at": None,
                "hidden_at": None,
            }

        state = states[0]

        return {
            "archived_at": state.archived_at,
            "hidden_at": state.hidden_at,
        }
