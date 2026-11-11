"""Transactional services for private project conversations."""

import uuid

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext as _
from django.utils.translation import gettext_noop

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.projects.models import Project, ProjectExpertInvitation

from .models import Conversation, ConversationUserState, Message


def _require_authenticated_user(user):
    if not getattr(user, "is_authenticated", False) or user.pk is None:
        raise PermissionDenied(_("Authentication is required."))


def _require_active_personal_account(account):
    if (
        account is None
        or account.account_type != "PERSONAL"
        or account.person_id is None
        or not account.is_active
        or account.status != User.Status.ACTIVE
        or account.email_verified_at is None
    ):
        raise PermissionDenied(
            _("An active, email-verified personal account is required.")
        )


def _lock_invitation_context(*, user, invitation_id):
    """Lock in the same broad order as invitation lifecycle services.

    Project -> invitation -> participant accounts.
    """

    _require_authenticated_user(user)

    project_id = ProjectExpertInvitation.objects.values_list(
        "project_id",
        flat=True,
    ).get(pk=invitation_id)

    project = Project.objects.select_for_update().get(
        pk=project_id,
    )

    invitation = ProjectExpertInvitation.objects.select_for_update().get(
        pk=invitation_id, project=project
    )

    participant_ids = {
        invitation.invited_by_user_id,
        invitation.expert_user_id,
    }

    if user.pk not in participant_ids:
        raise PermissionDenied(
            _("You are not a participant in this conversation.")
        )

    accounts = {
        account.pk: account
        for account in (
            User.objects.select_for_update()
            .filter(pk__in=participant_ids)
            .order_by("pk")
        )
    }

    actor = accounts.get(user.pk)
    _require_active_personal_account(actor)

    return project, invitation, accounts, actor


def _lock_conversation_context(*, user, conversation_id):
    """Resolve an owned conversation and lock its lifecycle context."""

    _require_authenticated_user(user)

    # Scope the lookup before returning any conversation information.
    invitation_id = (
        Conversation.objects.filter(
            Q(owner_user_id=user.pk) | Q(expert_user_id=user.pk),
            pk=conversation_id,
        )
        .values_list("invitation_id", flat=True)
        .get()
    )

    project, invitation, accounts, actor = _lock_invitation_context(
        user=user,
        invitation_id=invitation_id,
    )

    conversation = Conversation.objects.select_for_update().get(
        pk=conversation_id,
        invitation=invitation,
    )

    if (
        conversation.owner_user_id != invitation.invited_by_user_id
        or conversation.expert_user_id != invitation.expert_user_id
    ):
        raise PermissionDenied(
            _("The conversation participant configuration is invalid.")
        )

    return project, invitation, accounts, actor, conversation


def _require_live_invitation(project, invitation):
    """Check whether the invitation currently permits new discussion."""

    now = timezone.now()

    if project.status in {
        Project.Status.CANCELLED,
        Project.Status.SUSPENDED,
    }:
        raise ValidationError(
            {"conversation": _("This project is not accepting messages.")}
        )

    if invitation.access_revoked_at is not None:
        raise ValidationError(
            {
                "conversation": _(
                    "This invitation's access has been revoked."
                )
            }
        )

    if invitation.status == ProjectExpertInvitation.Status.SENT:
        if invitation.expires_at <= now:
            raise ValidationError(
                {"conversation": _("This invitation has expired.")}
            )
        return

    if invitation.status == ProjectExpertInvitation.Status.ACCEPTED:
        return

    raise ValidationError(
        {
            "conversation": _(
                "New messages are unavailable for this invitation."
            )
        }
    )


def _ensure_participant_states(conversation):
    for user_id in (
        conversation.owner_user_id,
        conversation.expert_user_id,
    ):
        ConversationUserState.objects.get_or_create(
            conversation=conversation,
            user_id=user_id,
        )


def _validate_text(value, *, field, maximum, allow_blank=False):
    if not isinstance(value, str):
        raise ValidationError({field: _("Provide text.")})

    value = value.strip()

    if not allow_blank and not value:
        raise ValidationError({field: _("This field cannot be empty.")})

    if len(value) > maximum:
        raise ValidationError(
            {
                field: _("Use no more than {} characters.").format(maximum)
            }
        )

    return value


@transaction.atomic
def open_invitation_conversation(*, user, invitation_id):
    """Get an existing conversation or create the invitation's discussion."""

    project, invitation, accounts, actor = _lock_invitation_context(
        user=user,
        invitation_id=invitation_id,
    )

    conversation = Conversation.objects.filter(
        invitation=invitation,
    ).first()

    # Historical conversations remain readable even when new messages
    # are no longer permitted by the invitation.
    if conversation is not None:
        if (
            conversation.owner_user_id != invitation.invited_by_user_id
            or conversation.expert_user_id != invitation.expert_user_id
        ):
            raise PermissionDenied(
                _("The conversation participant configuration is invalid.")
            )

        _ensure_participant_states(conversation)
        return conversation

    _require_live_invitation(project, invitation)

    for account in accounts.values():
        _require_active_personal_account(account)

    conversation = Conversation(
        invitation=invitation,
        owner_user_id=invitation.invited_by_user_id,
        expert_user_id=invitation.expert_user_id,
        subject=_("Project discussion: {}").format(
            project.reference_number
        )[:255],
    )

    conversation.full_clean()
    conversation.save()

    _ensure_participant_states(conversation)

    return conversation


@transaction.atomic
def send_message(
    *,
    user,
    conversation_id,
    client_message_id,
    content,
    subject="",
):
    """Save a message, its notification, and its queued email together."""

    project, invitation, accounts, actor, conversation = _lock_conversation_context(
        user=user,
        conversation_id=conversation_id,
    )

    try:
        client_id = uuid.UUID(str(client_message_id))
    except (ValueError, TypeError, AttributeError) as error:
        raise ValidationError(
            {"client_message_id": _("Provide a valid UUID.")}
        ) from error

    max_length = int(getattr(settings, "PRIVATE_MESSAGE_MAX_LENGTH", 10000))

    if max_length < 1:
        raise ValidationError(
            _("The private message length configuration is invalid.")
        )

    content = _validate_text(
        content,
        field="content",
        maximum=max_length,
    )

    subject = _validate_text(
        subject,
        field="subject",
        maximum=255,
        allow_blank=True,
    )

    existing = Message.objects.filter(
        sender_user=actor,
        client_message_id=client_id,
    ).first()

    if existing is not None:
        if (
            existing.conversation_id != conversation.pk
            or existing.content != content
            or existing.subject != subject
        ):
            raise ValidationError(
                {
                    "client_message_id": (
                        _(
                            "This send identifier was already used "
                            "for a different message."
                        )
                    )
                }
            )

        # A retry returns the original message without sending
        # another notification or email.
        return existing

    if conversation.is_closed:
        raise ValidationError(
            {"conversation": _("This conversation is closed.")}
        )

    _require_live_invitation(project, invitation)

    recipient_id = (
        conversation.expert_user_id
        if actor.pk == conversation.owner_user_id
        else conversation.owner_user_id
    )

    recipient = accounts.get(recipient_id)
    _require_active_personal_account(recipient)

    message = Message(
        conversation=conversation,
        sender_user=actor,
        recipient_user=recipient,
        subject=subject,
        content=content,
        client_message_id=client_id,
        status=Message.Status.SENT,
    )

    message.full_clean()
    message.save()

    conversation.updated_at = timezone.now()
    conversation.save(update_fields=["updated_at"])

    _ensure_participant_states(conversation)

    # A successful new exchange restores this conversation to both
    # inboxes. It does not erase earlier messages.
    ConversationUserState.objects.filter(
        conversation=conversation,
    ).update(
        archived_at=None,
        hidden_at=None,
        updated_at=timezone.now(),
    )

    create_notification(
        recipient=recipient,
        notification_type=Notification.Type.MESSAGE,
        title=gettext_noop("You have a new private project message"),
        message=gettext_noop(
            "A participant sent you a private project message. "
            "Sign in to your account to read it."
        ),
        event_key=f"private-message:{message.pk}:recipient:{recipient.pk}",
        target_type=Notification.TargetType.CONVERSATION,
        target_id=conversation.pk,
        send_email=True,
    )

    return message


@transaction.atomic
def mark_messages_read(
    *,
    user,
    conversation_id,
    through_message_id,
):
    """Mark incoming messages read up to an explicitly displayed message.

    Listing a conversation must not call this automatically.
    """

    project, invitation, accounts, actor, conversation = _lock_conversation_context(
        user=user,
        conversation_id=conversation_id,
    )

    # The boundary must belong to this conversation. It may be an
    # incoming or outgoing message displayed in the timeline.
    boundary = Message.objects.get(
        pk=through_message_id,
        conversation=conversation,
    )

    unread = Message.objects.filter(
        conversation=conversation,
        recipient_user=actor,
        pk__lte=boundary.pk,
        read_at__isnull=True,
    )

    now = timezone.now()

    # Reading implies delivery. Preserve an existing delivery timestamp.
    unread.filter(delivered_at__isnull=True).update(
        delivered_at=now,
    )

    updated = unread.update(
        status=Message.Status.READ,
        read_at=now,
    )

    return updated


@transaction.atomic
def set_conversation_inbox_state(
    *,
    user,
    conversation_id,
    archived=None,
    hidden=None,
):
    """Change only the acting participant's archive/hide preferences."""

    project, invitation, accounts, actor, conversation = _lock_conversation_context(
        user=user,
        conversation_id=conversation_id,
    )

    if archived is None and hidden is None:
        raise ValidationError(_("Provide archived or hidden."))

    for field, value in (
        ("archived", archived),
        ("hidden", hidden),
    ):
        if value is not None and not isinstance(value, bool):
            raise ValidationError({field: _("Provide true or false.")})

    state, _created = ConversationUserState.objects.get_or_create(
        conversation=conversation,
        user=actor,
    )

    now = timezone.now()

    if archived is not None:
        state.archived_at = now if archived else None

    if hidden is not None:
        state.hidden_at = now if hidden else None

    state.full_clean()
    state.save(
        update_fields=[
            "archived_at",
            "hidden_at",
            "updated_at",
        ]
    )

    return state
