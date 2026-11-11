"""Private conversations between a project owner and an invited Expert.

Messages are plain text. File attachments are deliberately not included.

Conversation visibility preferences are stored separately for each
participant rather than changing a shared message status.
"""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _


class Conversation(models.Model):
    """A two-person discussion attached to a project invitation."""

    invitation = models.OneToOneField(
        "projects.ProjectExpertInvitation",
        on_delete=models.PROTECT,
        related_name="conversation",
    )

    # Participant identities are copied from the invitation by the
    # service, never accepted from a client payload.
    owner_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="owned_project_conversations",
    )

    expert_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="expert_project_conversations",
    )

    subject = models.CharField(max_length=255)

    # An explicit conversation restriction, separate from invitation
    # status and document-viewing permissions.
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    closure_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-pk"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(owner_user=F("expert_user")),
                name="chat_distinct_participants",
            ),
        ]

    def clean(self):
        super().clean()

        if not self.invitation_id:
            return

        invitation = self.invitation
        errors = {}

        if self.owner_user_id != invitation.invited_by_user_id:
            errors["owner_user"] = (
                "The conversation owner must be the applicant "
                "who sent the invitation."
            )

        if self.expert_user_id != invitation.expert_user_id:
            errors["expert_user"] = (
                "The conversation Expert must match the invited account."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"Conversation {self.pk}: invitation {self.invitation_id}"


class ConversationUserState(models.Model):
    """An individual participant's inbox preferences.

    Archiving or hiding does not revoke project access or erase messages.
    A future incoming message may restore the conversation in the inbox,
    according to the messaging service's rules.
    """

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.PROTECT,
        related_name="user_states",
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="conversation_states",
    )

    archived_at = models.DateTimeField(null=True, blank=True)

    # Local inbox hiding, not permanent deletion of shared history.
    hidden_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="chat_unique_participant_state",
            ),
        ]

    def clean(self):
        super().clean()

        if self.conversation_id and self.user_id:
            conversation = self.conversation

            if self.user_id not in {
                conversation.owner_user_id,
                conversation.expert_user_id,
            }:
                raise ValidationError(
                    {
                        "user": _(
                            "Only a conversation participant "
                            "may have an inbox state."
                        )
                    }
                )


class Message(models.Model):
    """One plain-text message within a private conversation."""

    class Status(models.TextChoices):
        SENT = "SENT", "Saved by the platform"
        DELIVERED = "DELIVERED", "Acknowledged by recipient client"
        READ = "READ", "Read by recipient"

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.PROTECT,
        related_name="messages",
    )

    sender_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="private_messages_sent",
    )

    recipient_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="private_messages_received",
    )

    # Optional per-message subject. The conversation also has a subject.
    subject = models.CharField(max_length=255, blank=True)
    content = models.TextField()

    # The browser will generate this once per send operation and reuse
    # it when retrying. The service checks it before creating a message.
    client_message_id = models.UUIDField(default=uuid.uuid4)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
    )

    sent_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["sent_at", "pk"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(sender_user=F("recipient_user")),
                name="chat_message_distinct_users",
            ),
            models.UniqueConstraint(
                fields=["sender_user", "client_message_id"],
                name="chat_unique_sender_client_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["conversation", "sent_at"],
                name="chat_message_timeline_idx",
            ),
            models.Index(
                fields=["recipient_user", "read_at"],
                name="chat_recipient_unread_idx",
            ),
        ]

    def clean(self):
        super().clean()

        errors = {}

        if not self.content or not self.content.strip():
            errors["content"] = _("Enter a message.")

        if self.conversation_id:
            conversation = self.conversation

            valid_pairs = {
                (
                    conversation.owner_user_id,
                    conversation.expert_user_id,
                ),
                (
                    conversation.expert_user_id,
                    conversation.owner_user_id,
                ),
            }

            if (
                self.sender_user_id,
                self.recipient_user_id,
            ) not in valid_pairs:
                errors["recipient_user"] = _(
                    "The sender and recipient must be the "
                    "two conversation participants."
                )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        # Do not expose private message content in object labels.
        return f"Message {self.pk}: conversation {self.conversation_id}"
