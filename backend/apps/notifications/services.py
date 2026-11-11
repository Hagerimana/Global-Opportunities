"""System-generated notifications and queued email alerts."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.translation import gettext as _
from django.utils.translation import gettext_noop

from .models import Notification, NotificationEmailDelivery


@transaction.atomic
def create_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    event_key,
    target_type="",
    target_id=None,
    send_email=True,
):
    """Create one notification and optionally one email job.

    Callers must supply a stable event key.
    Repeated calls for the same event/recipient do not create
    another notification or email job.
    """

    if notification_type not in Notification.Type.values:
        raise ValidationError(_("Unsupported notification type."))

    if not event_key or len(event_key) > 200:
        raise ValidationError(
            _(
                "A non-empty event key of at most 200 characters is required."
            )
        )

    if target_type and target_type not in Notification.TargetType.values:
        raise ValidationError(_("Unsupported notification target."))

    if bool(target_type) != (target_id is not None):
        raise ValidationError(
            _("Provide both target_type and target_id, or neither.")
        )

    title = " ".join(title.splitlines()).strip()

    if not title or len(title) > 255:
        raise ValidationError(
            _("Notification title must contain 1–255 characters.")
        )

    notice, created = Notification.objects.get_or_create(
        event_key=event_key,
        defaults={
            "recipient_user": recipient,
            "type": notification_type,
            "title": title,
            "message": message,
            "target_type": target_type,
            "target_id": target_id,
        },
    )

    if not created:
        if notice.recipient_user_id != recipient.pk:
            raise ValidationError(
                _("This event key belongs to a different recipient.")
            )

        return notice

    if send_email:
        frontend_url = settings.FRONTEND_BASE_URL.rstrip("/")

        NotificationEmailDelivery.objects.create(
            notification=notice,
            recipient_email=recipient.email,
            subject=_(title),
            body=(
                f"{_(message)}\n\n"
                + _(
                    "Sign in to Global Opportunities to view the details:"
                )
                + f"\n{frontend_url}/auth/login\n\n"
                + _(
                    "This email does not contain the project document "
                    "or private conversation content."
                )
            ),
        )

    return notice


def notify_expert_invitation_event(event):
    """Create the alert associated with an invitation event.

    Called from the invitation service's transaction.
    """

    invitation = event.invitation
    event_type = event.event_type

    if event_type == "SENT":
        recipient = invitation.expert_user
        title = gettext_noop("You have received a project Expert invitation")
        message = gettext_noop(
            "A project owner has invited you to provide Expert guidance. "
            "Sign in to review the invitation and respond."
        )

    elif event_type == "ACCEPTED":
        recipient = invitation.invited_by_user
        title = gettext_noop("Your Expert invitation was accepted")
        message = gettext_noop(
            "The invited Expert accepted your project invitation. "
            "Sign in to view the invitation details."
        )

    elif event_type == "REJECTED":
        recipient = invitation.invited_by_user
        title = gettext_noop("Your Expert invitation was declined")
        message = gettext_noop(
            "The invited Expert declined your project invitation. "
            "Sign in to review the invitation."
        )

    elif event_type == "CANCELLED":
        recipient = invitation.expert_user
        title = gettext_noop("A project Expert invitation was cancelled")
        message = gettext_noop(
            "The project owner cancelled an Expert invitation. "
            "Its invitation-based document access has been revoked."
        )

    elif event_type == "EXPIRED":
        recipient = invitation.invited_by_user
        title = gettext_noop("Your Expert invitation expired")
        message = gettext_noop(
            "An Expert invitation passed its response deadline. "
            "Sign in to review it and decide whether to invite again."
        )

    else:
        return None

    return create_notification(
        recipient=recipient,
        notification_type=Notification.Type.INVITATION,
        title=title,
        message=message,
        event_key=(f"expert-invitation-event:{event.pk}:" f"recipient:{recipient.pk}"),
        target_type=Notification.TargetType.EXPERT_INVITATION,
        target_id=invitation.pk,
        send_email=True,
    )
