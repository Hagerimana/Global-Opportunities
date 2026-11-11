"""Transactional operations for professional-profile applications."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.accounts.models import AccountType, User

from .models import (
    ProfileDocumentRequirement,
    ProfileType,
    ProfessionalProfile,
    ProfessionalProfileRequest,
    ProfessionalProfileRequestEvent,
    ProfessionalProfileRequestRequirement,
)


def development_approval_enabled():
    """Whether the explicit development-only activation shortcut is available.

    DEBUG plus PROFESSIONAL_PROFILES_AUTO_APPROVE covers local development
    runs. PROFESSIONAL_PROFILES_DEVELOPMENT_APPROVAL covers the local Docker
    demonstration, which has no human review workflow yet; every other
    settings module leaves it unset, which keeps the shortcut disabled.
    """

    return (
        settings.DEBUG
        and getattr(
            settings,
            "PROFESSIONAL_PROFILES_AUTO_APPROVE",
            False,
        )
    ) or bool(
        getattr(
            settings,
            "PROFESSIONAL_PROFILES_DEVELOPMENT_APPROVAL",
            False,
        )
    )


def _require_eligible_personal_account(user):
    """Reject accounts that cannot request a professional profile."""

    if user.account_type != AccountType.PERSONAL or user.person_id is None:
        raise ValidationError(
            {
                "account": (
                    _(
                        "Only personal accounts with a linked person "
                        "can request a professional profile."
                    )
                )
            }
        )

    if not user.is_active or user.status != User.Status.ACTIVE:
        raise ValidationError(
            {
                "account": (
                    _(
                        "Your account must be active before requesting "
                        "a professional profile."
                    )
                )
            }
        )

    if user.email_verified_at is None:
        raise ValidationError(
            {
                "account": (
                    _(
                        "Verify your login email before requesting "
                        "a professional profile."
                    )
                )
            }
        )


def _application_snapshot(application):
    """Return application values suitable for internal audit history."""

    return {
        "request_type": application.request_type,
        "requested_role": application.requested_role,
        "previous_profile_id": application.previous_profile_id,
        "domain": application.domain,
        "motivation": application.motivation,
        "qualifications": application.qualifications,
        "biography": application.biography,
        "years_experience": application.years_experience,
        "professional_title": application.professional_title,
        "teaching_methodology": application.teaching_methodology,
    }


def _requirement_snapshot(requirement):
    """Preserve the configuration applied to this application."""

    return {
        "requirement_id": requirement.pk,
        "code": requirement.code,
        "profile_type": requirement.profile_type,
        "document_type_code": requirement.document_type.code,
        "document_type_name": requirement.document_type.name,
        "name": requirement.name,
        "description": requirement.description,
        "is_mandatory": requirement.is_mandatory,
        "is_conditional": requirement.is_conditional,
        "condition_rule": requirement.condition_rule,
        "accepted_file_types": list(requirement.accepted_file_types),
        "max_file_size": requirement.max_file_size,
        "validity_required": requirement.validity_required,
        "allow_not_applicable": requirement.allow_not_applicable,
        "display_order": requirement.display_order,
        "source_updated_at": requirement.updated_at.isoformat(),
    }


@transaction.atomic
def create_profile_request(
    *,
    user,
    requested_role,
    domain="",
    motivation="",
    qualifications="",
    biography="",
    years_experience=0,
    professional_title="",
    teaching_methodology="",
):
    """Create a draft, its requirement snapshots, and its first event.

    The caller must supply the authenticated user, not a user ID
    chosen from the request body.

    Drafts may be incomplete. Completeness is checked at submission.
    """

    if not getattr(user, "is_authenticated", False) or user.pk is None:
        raise ValidationError(
            {"account": _("Authentication is required.")}
        )

    # Lock the account first. Future profile-changing services must
    # use the same lock order.
    locked_user = User.objects.select_for_update().filter(pk=user.pk).first()

    if locked_user is None:
        raise ValidationError(
            {"account": _("This account no longer exists.")}
        )

    _require_eligible_personal_account(locked_user)

    if requested_role not in ProfileType.values:
        raise ValidationError(
            {"requested_role": _("Choose MENTOR, EXPERT, or TRAINER.")}
        )

    requirements = list(
        ProfileDocumentRequirement.objects.select_related("document_type")
        .filter(
            profile_type=requested_role,
            is_active=True,
        )
        .order_by("display_order", "pk")
    )

    if not requirements:
        raise ValidationError(
            {
                "requested_role": (
                    _(
                        "Document requirements have not been configured "
                        "for this professional profile."
                    )
                )
            }
        )

    # Do not silently omit a requirement because its document type
    # was deactivated. Treat that as inconsistent configuration.
    for requirement in requirements:
        requirement.full_clean()

        if not requirement.document_type.is_active:
            raise ValidationError(
                {
                    "requirements": (
                        _(
                            "The document type for '{}' is inactive. Please "
                            "contact an administrator."
                        ).format(requirement.name)
                    )
                }
            )

    # Include suspended previously approved profiles so a user does
    # not appear to be a first-time applicant after suspension.
    previous_profile = (
        ProfessionalProfile.objects.filter(
            user=locked_user,
            verification_status__in=[
                ProfessionalProfile.Verification.VERIFIED,
                ProfessionalProfile.Verification.SUSPENDED,
            ],
        )
        .order_by("-is_active", "-updated_at", "-pk")
        .first()
    )

    if previous_profile is None:
        request_type = ProfessionalProfileRequest.RequestType.INITIAL
    elif previous_profile.profile_type == requested_role:
        request_type = ProfessionalProfileRequest.RequestType.UPDATE
    else:
        request_type = ProfessionalProfileRequest.RequestType.PROFILE_SWITCH

    application = ProfessionalProfileRequest(
        user=locked_user,
        request_type=request_type,
        requested_role=requested_role,
        previous_profile=previous_profile,
        domain=domain,
        motivation=motivation,
        qualifications=qualifications,
        biography=biography,
        years_experience=years_experience,
        professional_title=professional_title,
        teaching_methodology=teaching_methodology,
        status=ProfessionalProfileRequest.Status.DRAFT,
    )

    # Django does not automatically call full_clean() on save().
    application.full_clean()
    application.save()

    requirement_history = []

    for requirement in requirements:
        snapshot = _requirement_snapshot(requirement)

        if requirement.is_conditional:
            applicability = (
                ProfessionalProfileRequestRequirement.Applicability.UNASSESSED
            )
            reason = ""
            assessed_at = None
        else:
            applicability = (
                ProfessionalProfileRequestRequirement.Applicability.REQUIRED
                if requirement.is_mandatory
                else ProfessionalProfileRequestRequirement.Applicability.OPTIONAL
            )
            reason = (
                "Automatically determined from the "
                "non-conditional requirement configuration."
            )
            assessed_at = timezone.now()

        request_requirement = ProfessionalProfileRequestRequirement(
            profile_request=application,
            requirement=requirement,
            configuration_snapshot=snapshot,
            applicability=applicability,
            applicability_reason=reason,
            assessed_at=assessed_at,
        )

        request_requirement.full_clean()
        request_requirement.save()

        requirement_history.append(
            {
                "application_requirement_id": (request_requirement.pk),
                "applicability": applicability,
                "configuration": snapshot,
            }
        )

    ProfessionalProfileRequestEvent.objects.create(
        profile_request=application,
        actor_user=locked_user,
        event_type=(ProfessionalProfileRequestEvent.EventType.CREATED),
        from_status="",
        to_status=ProfessionalProfileRequest.Status.DRAFT,
        comment=_("Professional profile draft created."),
        snapshot={
            "application": _application_snapshot(application),
            "requirements": requirement_history,
        },
    )

    from .development import approve_development_profile

    if development_approval_enabled() and application.domain:
        application = approve_development_profile(
            user=locked_user,
            request_id=application.pk,
        )

    return application


@transaction.atomic
def update_profile_request(*, user, request_id, changes):
    """Edit an owned draft without changing an effective profile."""

    locked_user = User.objects.select_for_update().get(pk=user.pk)
    _require_eligible_personal_account(locked_user)

    application = ProfessionalProfileRequest.objects.select_for_update().get(
        pk=request_id, user=locked_user
    )

    if application.status != ProfessionalProfileRequest.Status.DRAFT:
        raise ValidationError(
            {
                "status": (
                    _(
                        "Only draft applications can be edited "
                        "through this endpoint."
                    )
                )
            }
        )

    allowed_fields = {
        "domain",
        "motivation",
        "qualifications",
        "biography",
        "years_experience",
        "professional_title",
        "teaching_methodology",
    }

    unexpected = set(changes) - allowed_fields

    if unexpected:
        raise ValidationError(
            {field: _("This field cannot be changed.") for field in unexpected}
        )

    before = _application_snapshot(application)

    for field, value in changes.items():
        setattr(application, field, value)

    application.full_clean()

    after = _application_snapshot(application)

    if before == after:
        return application

    application.save()

    ProfessionalProfileRequestEvent.objects.create(
        profile_request=application,
        actor_user=locked_user,
        event_type=(ProfessionalProfileRequestEvent.EventType.DRAFT_UPDATED),
        from_status=ProfessionalProfileRequest.Status.DRAFT,
        to_status=ProfessionalProfileRequest.Status.DRAFT,
        comment=_("Professional profile draft updated."),
        snapshot={
            "before": before,
            "after": after,
        },
    )

    return application
