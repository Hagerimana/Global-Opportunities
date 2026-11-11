"""Explicit development-only professional-profile activation.

This bypasses document review for development fixtures.
It must not be used as a production approval workflow.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.accounts.models import Role, User, UserRole

from .models import (
    ProfessionalProfile,
    ProfessionalProfileRequest,
    ProfessionalProfileRequestEvent,
)
from .services import (
    _application_snapshot,
    _require_eligible_personal_account,
    development_approval_enabled,
)


@transaction.atomic
def approve_development_profile(*, user, request_id):
    if not development_approval_enabled():
        raise PermissionDenied(_("Development profile approval is disabled."))

    if not getattr(user, "is_authenticated", False):
        raise PermissionDenied(_("Authentication is required."))

    account = User.objects.select_for_update().get(pk=user.pk)
    _require_eligible_personal_account(account)

    application = ProfessionalProfileRequest.objects.select_for_update().get(
        pk=request_id, user=account
    )

    if (
        application.status == ProfessionalProfileRequest.Status.APPROVED
        and application.development_auto_approved
    ):
        return application

    if application.status != ProfessionalProfileRequest.Status.DRAFT:
        raise ValidationError({"status": _("Choose a draft application.")})

    if not application.domain:
        raise ValidationError(
            {"domain": _("Select a professional domain first.")}
        )

    current = (
        ProfessionalProfile.objects.select_for_update()
        .filter(user=account, is_active=True)
        .first()
    )

    if current is not None:
        if application.previous_profile_id != current.pk:
            raise ValidationError(
                {
                    "profile": (
                        _(
                            "Your active profile changed after this draft "
                            "was created. Create a new update or switch "
                            "request."
                        )
                    )
                }
            )

    if application.previous_profile_id:
        previous = ProfessionalProfile.objects.get(
            pk=application.previous_profile_id,
            user=account,
        )

        if previous.verification_status == ProfessionalProfile.Verification.SUSPENDED:
            raise ValidationError(
                _("Development approval cannot override a suspension.")
            )

    target = (
        ProfessionalProfile.objects.select_for_update()
        .filter(
            user=account,
            profile_type=application.requested_role,
        )
        .first()
    )

    if target is not None and (
        target.verification_status == ProfessionalProfile.Verification.SUSPENDED
    ):
        raise ValidationError(
            _("Development approval cannot override a suspension.")
        )

    now = timezone.now()
    before = None

    if current is not None:
        before = {
            "profile_id": current.pk,
            "profile_type": current.profile_type,
            "domain": current.domain,
            "biography": current.biography,
            "qualifications": current.qualifications,
            "years_experience": current.years_experience,
            "professional_title": current.professional_title,
            "teaching_methodology": current.teaching_methodology,
        }

        current.is_active = False
        current.deactivated_at = now
        current.save(
            update_fields=[
                "is_active",
                "deactivated_at",
                "updated_at",
            ]
        )

    if target is None:
        target = ProfessionalProfile(
            user=account,
            profile_type=application.requested_role,
        )

    target.domain = application.domain
    target.biography = application.biography
    target.qualifications = application.qualifications
    target.years_experience = application.years_experience
    target.professional_title = application.professional_title
    target.teaching_methodology = application.teaching_methodology
    target.verification_status = ProfessionalProfile.Verification.VERIFIED
    target.availability = ProfessionalProfile.Availability.AVAILABLE
    target.is_active = True
    target.activated_at = now
    target.deactivated_at = None

    target.full_clean()
    target.save()

    professional_codes = ["MENTOR", "EXPERT", "TRAINER"]

    UserRole.objects.filter(
        user=account,
        role__code__in=professional_codes,
    ).exclude(
        role__code=application.requested_role,
    ).delete()

    # Do not name the second value "_": that would shadow the gettext
    # alias used below for review_comment.
    role, created = Role.objects.get_or_create(
        code=application.requested_role,
        defaults={
            "name": application.requested_role.title(),
            "description": "Professional profile role.",
        },
    )

    UserRole.objects.get_or_create(
        user=account,
        role=role,
    )

    application.status = ProfessionalProfileRequest.Status.APPROVED
    application.resulting_profile = target
    application.development_auto_approved = True
    application.reviewer_user = None
    application.review_comment = _(
        "Development-only simulated approval. "
        "Document review was bypassed; evidence was not verified."
    )
    application.submitted_at = application.submitted_at or now
    application.reviewed_at = now
    application.save()

    ProfessionalProfileRequestEvent.objects.create(
        profile_request=application,
        actor_user=None,
        event_type=(ProfessionalProfileRequestEvent.EventType.DEVELOPMENT_APPROVED),
        from_status=ProfessionalProfileRequest.Status.DRAFT,
        to_status=ProfessionalProfileRequest.Status.APPROVED,
        comment=application.review_comment,
        snapshot={
            "previous_profile": before,
            "application": _application_snapshot(application),
            "resulting_profile_id": target.pk,
            "document_review_bypassed": True,
        },
    )

    return application
