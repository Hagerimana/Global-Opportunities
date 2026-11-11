"""Transactional Expert invitation lifecycle operations.

These services record invitations and decisions.
Email/notification delivery will be connected separately.
"""

from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.accounts.models import User

from .access import has_approved_expert_profile
from .models import (
    Project,
    ProjectExpertInvitation,
    ProjectExpertInvitationEvent,
)


def _require_authenticated_user(user):
    if not getattr(user, "is_authenticated", False) or user.pk is None:
        raise PermissionDenied(_("Authentication is required."))


def _lock_accounts(*user_ids):
    """Lock account rows in a consistent order."""

    accounts = (
        User.objects.select_for_update().filter(pk__in=set(user_ids)).order_by("pk")
    )

    return {account.pk: account for account in accounts}


def _require_active_account(account):
    if (
        account is None
        or not account.is_active
        or account.status != User.Status.ACTIVE
        or account.email_verified_at is None
    ):
        raise PermissionDenied(
            _("An active, email-verified account is required.")
        )


def _record_event(invitation, event_type, actor=None, comment=""):
    from apps.notifications.services import (
        notify_expert_invitation_event,
    )

    event = ProjectExpertInvitationEvent.objects.create(
        invitation=invitation,
        actor_user=actor,
        event_type=event_type,
        comment=comment,
    )

    notify_expert_invitation_event(event)

    return event


def _locked_invitation(invitation_id):
    """Lock the project before the invitation for lifecycle changes."""

    project_id = ProjectExpertInvitation.objects.values_list(
        "project_id",
        flat=True,
    ).get(pk=invitation_id)

    project = Project.objects.select_for_update().get(
        pk=project_id,
    )

    invitation = ProjectExpertInvitation.objects.select_for_update().get(
        pk=invitation_id,
        project=project,
    )

    return project, invitation


@transaction.atomic
def create_expert_invitation(
    *,
    user,
    project_id,
    expert_user_id,
    message="",
):
    """Record an invitation from the project creator to an Expert."""

    _require_authenticated_user(user)

    project = Project.objects.select_for_update().get(
        pk=project_id,
    )

    if project.created_by_user_id != user.pk:
        raise PermissionDenied(_("Only the project creator may invite an Expert."))

    accounts = _lock_accounts(user.pk, expert_user_id)
    creator = accounts.get(user.pk)
    expert = accounts.get(expert_user_id)

    _require_active_account(creator)
    _require_active_account(expert)

    if creator.account_type != "PERSONAL" or creator.person_id is None:
        raise PermissionDenied(_("A personal applicant account is required."))

    if creator.pk == expert.pk:
        raise ValidationError(
            {"expert_user": _("You cannot invite yourself.")}
        )

    if not has_approved_expert_profile(expert):
        raise ValidationError(
            {
                "expert_user": _(
                    "Choose an account with an active, "
                    "approved Expert profile."
                )
            }
        )

    if project.status not in {
        Project.Status.DRAFT,
        Project.Status.POSTED,
    }:
        raise ValidationError(
            {
                "project": (
                    _(
                        "Expert invitations through this workflow "
                        "are available for draft or posted projects."
                    )
                )
            }
        )

    now = timezone.now()

    # Expired pending invitations must not prevent a new invitation.
    expired = ProjectExpertInvitation.objects.select_for_update().filter(
        project=project,
        expert_user=expert,
        status=ProjectExpertInvitation.Status.SENT,
        expires_at__lte=now,
        access_revoked_at__isnull=True,
    )

    for old_invitation in expired:
        old_invitation.status = ProjectExpertInvitation.Status.EXPIRED
        old_invitation.access_revoked_at = now
        old_invitation.access_revocation_reason = _(
            "The invitation response deadline passed."
        )
        old_invitation.save(
            update_fields=[
                "status",
                "access_revoked_at",
                "access_revocation_reason",
                "updated_at",
            ]
        )

        _record_event(
            old_invitation,
            ProjectExpertInvitationEvent.EventType.EXPIRED,
            comment=_("Invitation response deadline passed."),
        )

    if ProjectExpertInvitation.objects.filter(
        project=project,
        expert_user=expert,
        status__in=[
            ProjectExpertInvitation.Status.SENT,
            ProjectExpertInvitation.Status.ACCEPTED,
        ],
        access_revoked_at__isnull=True,
    ).exists():
        raise ValidationError(
            {
                "expert_user": (
                    _(
                        "This Expert already has a live invitation "
                        "for this project."
                    )
                )
            }
        )

    invitation_days = int(
        getattr(
            settings,
            "PROJECT_EXPERT_INVITATION_DAYS",
            7,
        )
    )

    if invitation_days < 1:
        raise ValidationError(
            _("The invitation lifetime must be at least one day.")
        )

    invitation = ProjectExpertInvitation(
        project=project,
        expert_user=expert,
        invited_by_user=creator,
        message=message,
        status=ProjectExpertInvitation.Status.SENT,
        expires_at=now + timedelta(days=invitation_days),
    )

    invitation.full_clean()
    invitation.save()

    _record_event(
        invitation,
        ProjectExpertInvitationEvent.EventType.SENT,
        actor=creator,
        comment=_("Expert invitation recorded."),
    )

    return invitation


@transaction.atomic
def respond_to_expert_invitation(
    *,
    user,
    invitation_id,
    accept,
):
    """Accept or reject an invitation as the invited Expert."""

    _require_authenticated_user(user)

    if not isinstance(accept, bool):
        raise ValidationError({"accept": _("Provide true or false.")})

    project, invitation = _locked_invitation(invitation_id)

    if invitation.expert_user_id != user.pk:
        raise PermissionDenied(_("Only the invited Expert may respond."))

    accounts = _lock_accounts(user.pk)
    expert = accounts.get(user.pk)
    _require_active_account(expert)

    now = timezone.now()

    if (
        invitation.status != ProjectExpertInvitation.Status.SENT
        or invitation.access_revoked_at is not None
        or invitation.expires_at <= now
    ):
        raise ValidationError(
            {"invitation": _("This invitation is no longer awaiting a response.")}
        )

    if accept:
        if project.status in {
            Project.Status.CANCELLED,
            Project.Status.SUSPENDED,
        }:
            raise ValidationError(
                {"project": _("This project cannot accept guidance now.")}
            )

        if not has_approved_expert_profile(expert):
            raise ValidationError(
                {
                    "account": (
                        _(
                            "An active, approved Expert profile "
                            "is required to accept."
                        )
                    )
                }
            )

        invitation.status = ProjectExpertInvitation.Status.ACCEPTED
        event_type = ProjectExpertInvitationEvent.EventType.ACCEPTED
    else:
        invitation.status = ProjectExpertInvitation.Status.REJECTED
        invitation.access_revoked_at = now
        invitation.access_revocation_reason = _(
            "The Expert rejected the invitation."
        )
        event_type = ProjectExpertInvitationEvent.EventType.REJECTED

    invitation.responded_at = now
    invitation.save(
        update_fields=[
            "status",
            "responded_at",
            "access_revoked_at",
            "access_revocation_reason",
            "updated_at",
        ]
    )

    _record_event(
        invitation,
        event_type,
        actor=expert,
    )

    return invitation


@transaction.atomic
def cancel_expert_invitation(*, user, invitation_id):
    """Cancel an invitation and revoke its document-viewing grant."""

    _require_authenticated_user(user)

    project, invitation = _locked_invitation(invitation_id)

    if project.created_by_user_id != user.pk:
        raise PermissionDenied(
            _("Only the project creator may cancel this invitation.")
        )

    accounts = _lock_accounts(user.pk)
    creator = accounts.get(user.pk)
    _require_active_account(creator)

    if invitation.status not in {
        ProjectExpertInvitation.Status.SENT,
        ProjectExpertInvitation.Status.ACCEPTED,
    }:
        raise ValidationError(
            {"invitation": _("This invitation cannot be cancelled.")}
        )

    now = timezone.now()

    invitation.status = ProjectExpertInvitation.Status.CANCELLED
    invitation.cancelled_at = now
    invitation.access_revoked_at = now
    invitation.access_revocation_reason = _(
        "The project creator cancelled the invitation."
    )

    invitation.save(
        update_fields=[
            "status",
            "cancelled_at",
            "access_revoked_at",
            "access_revocation_reason",
            "updated_at",
        ]
    )

    _record_event(
        invitation,
        ProjectExpertInvitationEvent.EventType.CANCELLED,
        actor=creator,
    )

    return invitation
