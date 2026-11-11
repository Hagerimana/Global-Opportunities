"""Project proposal authorization and protected-reader readiness."""

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.professional_profiles.models import ProfessionalProfile

from .models import (
    Project,
    ProjectExpertInvitation,
    ProjectProposalDocument,
)


def active_account(user):
    if not getattr(user, "is_authenticated", False) or user.pk is None:
        return None

    return User.objects.filter(
        pk=user.pk,
        is_active=True,
        status=User.Status.ACTIVE,
        email_verified_at__isnull=False,
    ).first()


def has_approved_expert_profile(user):
    return (
        getattr(user, "account_type", None) == "PERSONAL"
        and getattr(user, "person_id", None) is not None
        and ProfessionalProfile.objects.filter(
            user=user,
            profile_type="EXPERT",
            verification_status="VERIFIED",
            is_active=True,
        ).exists()
    )


def project_is_available_to_organizations(project):
    return project.posted_at is not None and project.status not in {
        Project.Status.DRAFT,
        Project.Status.CANCELLED,
        Project.Status.SUSPENDED,
    }


def verified_organization(user):
    account = active_account(user)

    if account is None or account.account_type != "ORGANIZATION":
        return None

    return Organization.objects.filter(
        owner=account,
        verification_status=Organization.Verification.VERIFIED,
    ).first()


def accepted_project_expert(account, project):
    if not has_approved_expert_profile(account):
        return False

    if project.status in {
        Project.Status.CANCELLED,
        Project.Status.SUSPENDED,
    }:
        return False

    return ProjectExpertInvitation.objects.filter(
        project=project,
        expert_user=account,
        status=ProjectExpertInvitation.Status.ACCEPTED,
        access_revoked_at__isnull=True,
        cancelled_at__isnull=True,
    ).exists()


def project_reader_identity(*, user, project):
    """Return the authorized reader's watermark label, or None."""

    account = active_account(user)

    if account is None:
        return None

    # Preserve the existing creator-preview permission.
    if project.created_by_user_id == account.pk:
        return "Project creator"

    if accepted_project_expert(account, project):
        return "Accepted project Expert"

    if project_is_available_to_organizations(project):
        organization = verified_organization(account)

        if organization is not None:
            return organization.name

    return None


def proposal_is_reader_ready(proposal):
    """Readiness does not grant authorization."""

    if (
        not proposal.is_current
        or proposal.processing_status != ProjectProposalDocument.ProcessingStatus.READY
        or proposal.scan_status != ProjectProposalDocument.ScanStatus.CLEAN
        or proposal.page_count < 1
    ):
        return False

    numbers = list(
        proposal.pages.order_by("page_number").values_list(
            "page_number",
            flat=True,
        )
    )

    return numbers == list(range(1, proposal.page_count + 1))


def can_view_project_proposal(*, user, proposal_id):
    """Compatibility helper combining permission and readiness."""

    proposal = (
        ProjectProposalDocument.objects.select_related("project")
        .filter(pk=proposal_id)
        .first()
    )

    if proposal is None:
        return False

    if (
        project_reader_identity(
            user=user,
            project=proposal.project,
        )
        is None
    ):
        return False

    return proposal_is_reader_ready(proposal)
