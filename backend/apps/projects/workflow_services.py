"""Ordered project-posting workflow services and server-side gates."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _lazy
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.accounts.models import AccountType, User
from apps.persons.applicant_services import assert_personal_information_ready
from apps.professional_profiles.models import ProfessionalDomain
from .models import Project, ProjectExpertInvitation, ProjectProposalDocument
from django.db.models import Q
from .access import proposal_is_reader_ready

MAX_PDF_BYTES = 20 * 1024 * 1024
PDF_MAGIC = b"%PDF-"
WORKFLOW_STEPS = (
    "PDF_UPLOAD",
    "DOMAIN",
    "DESCRIPTION_AND_FUNDING",
    "EXPERT_INVITATION",
    "PERSONAL_INFORMATION",
    "REVIEW_AND_POST",
)
WORKFLOW_STEP_LABELS = {
    "PDF_UPLOAD": _lazy("PDF upload"),
    "DOMAIN": _lazy("project domain"),
    "DESCRIPTION_AND_FUNDING": _lazy("description and funding"),
    "EXPERT_INVITATION": _lazy("Expert invitation"),
    "PERSONAL_INFORMATION": _lazy("personal information"),
    "REVIEW_AND_POST": _lazy("review and post"),
}


def require_workflow_account(user):
    if not (
        user.is_active
        and user.status == User.Status.ACTIVE
        and user.email_verified_at is not None
        and user.account_type == AccountType.PERSONAL
        and user.person_id is not None
    ):
        raise PermissionDenied(
            _("An active, email-verified personal account is required.")
        )


def current_proposal(project):
    """
    Latest upload for workflow tracking.

    Upload existence is separate from protected-reader readiness.
    """
    return (
        project.proposal_documents.select_related("project")
        .order_by("-version")
        .first()
    )


def description_and_funding_issues(project):
    issues = {}
    required_text = {
        "title": _("Enter the project name."),
        "problem_statement": _("Describe the problem."),
        "solution": _("Describe the solution."),
        "conclusion": _("Provide a conclusion."),
        "objectives": _("Enter the objectives."),
        "expected_results": _("Enter the expected results."),
        "target_population": _("Enter the target population."),
        "location": _("Enter the project location."),
    }
    for field, message in required_text.items():
        if not str(getattr(project, field) or "").strip():
            issues[field] = message

    for field in ("total_budget", "requested_amount", "own_contribution"):
        if getattr(project, field) is None:
            issues[field] = _("Enter this funding amount.")

        if not (project.start_date and project.end_date):
            issues["start_date"] = (
                issues.get("start_date") or _("Enter the planned start date.")
            )
            issues["end_date"] = issues.get("end_date") or _(
                "Enter the planned end date."
            )

    return issues


def invitation_issue(project):
    """A live pending or accepted invitation satisfies this workflow step."""

    now = timezone.now()

    return (
        not project.expert_invitations.filter(
            access_revoked_at__isnull=True,
            cancelled_at__isnull=True,
        )
        .filter(
            Q(
                status=ProjectExpertInvitation.Status.SENT,
                expires_at__gt=now,
            )
            | Q(
                status=ProjectExpertInvitation.Status.ACCEPTED,
            )
        )
        .exists()
    )


def workflow_state(project, user):
    proposal = current_proposal(project)
    description_issues = description_and_funding_issues(project)
    needs_invitation = invitation_issue(project)
    personal_issues = {}
    try:
        assert_personal_information_ready(user.person, user)
    except ValidationError as exc:
        personal_issues = (
            exc.detail.get("personal_information", {})
            if isinstance(exc.detail, dict)
            else {"personal_information": exc.detail}
        )

    completed = {
        "PDF_UPLOAD": proposal is not None,
        "DOMAIN": bool(project.domain),
        "DESCRIPTION_AND_FUNDING": not description_issues,
        "EXPERT_INVITATION": not needs_invitation,
        "PERSONAL_INFORMATION": not personal_issues,
    }
    completed["REVIEW_AND_POST"] = all(completed.values())
    next_step = next(
        (step for step in WORKFLOW_STEPS if not completed[step]),
        "REVIEW_AND_POST",
    )
    return {
        "project_id": project.pk,
        "reference_number": project.reference_number,
        "status": project.status,
        "current_step": next_step,
        "steps": [
            {"key": step, "is_complete": completed[step]} for step in WORKFLOW_STEPS
        ],
        "pdf": (
            {
                "uploaded": proposal is not None,
                "processing_status": proposal.processing_status if proposal else None,
                "scan_status": proposal.scan_status if proposal else None,
                "version": proposal.version if proposal else None,
                "original_filename": proposal.original_filename if proposal else None,
            }
            if proposal
            else {"uploaded": False}
        ),
        "issues": {
            "description_and_funding": description_issues,
            "personal_information": personal_issues,
            "expert_invitation": (
                _("Invite an approved Expert before posting.")
                if needs_invitation
                else ""
            ),
        },
    }


def validate_pdf_upload(uploaded_file):
    if uploaded_file is None:
        raise ValidationError({"file": _("Select a PDF file.")})
    uploaded_file.seek(0)
    head = uploaded_file.read(1024)
    uploaded_file.seek(0)
    if not head.startswith(PDF_MAGIC):
        raise ValidationError(
            {"file": _("The uploaded file must be a valid PDF.")}
        )
    if uploaded_file.size > MAX_PDF_BYTES:
        raise ValidationError(
            {"file": _("The PDF must be 20 MB or smaller.")}
        )
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ValidationError(
            {"file": _("PDF processing is temporarily unavailable.")}
        ) from exc
    try:
        reader = PdfReader(uploaded_file)
        page_count = len(reader.pages)
        from django.conf import settings

        if page_count < 1:
            raise ValueError(_("The PDF has no pages."))

        if page_count > settings.PROJECT_READER_MAX_PAGES:
            raise ValueError(_("The PDF exceeds the page-count limit."))
    except Exception as exc:
        raise ValidationError({"file": _("The PDF could not be read.")}) from exc
    uploaded_file.seek(0)
    return page_count


@transaction.atomic
def create_project_from_pdf(user, uploaded_file):
    from .tasks import enqueue_preparation

    require_workflow_account(user)
    page_count = validate_pdf_upload(uploaded_file)

    project = Project.objects.create(
        created_by_user=user,
        status=Project.Status.DRAFT,
    )

    proposal = ProjectProposalDocument.objects.create(
        project=project,
        uploaded_by_user=user,
        version=1,
        original_file=uploaded_file,
        original_filename=(uploaded_file.name or "project.pdf")[:255],
        detected_mime_type="application/pdf",
        file_size=uploaded_file.size,
        page_count=page_count,
        processing_status=(ProjectProposalDocument.ProcessingStatus.PENDING),
        scan_status=(ProjectProposalDocument.ScanStatus.NOT_SCANNED),
        is_current=False,
    )

    proposal.full_clean()

    transaction.on_commit(
        lambda proposal_id=proposal.pk: enqueue_preparation(proposal_id)
    )

    return project


def owned_draft(user, project_id):
    require_workflow_account(user)
    try:
        project = Project.objects.select_for_update().get(
            pk=project_id,
            created_by_user=user,
        )
    except Project.DoesNotExist as exc:
        raise PermissionDenied(_("Project not found.")) from exc
    if project.status != Project.Status.DRAFT:
        raise ValidationError(
            {"status": _("Only drafts can be edited in this workflow.")}
        )
    return project


def require_step(project, required_step):
    state = workflow_state(project, project.created_by_user)
    index = WORKFLOW_STEPS.index(required_step)

    incomplete = [
        item["key"] for item in state["steps"][:index] if not item["is_complete"]
    ]

    if incomplete:
        step_label = WORKFLOW_STEP_LABELS.get(
            required_step,
            required_step.lower().replace("_", " "),
        )
        error = {
            "workflow": _(
                "Complete earlier steps before you continue to the “{step}” step."
            ).format(step=step_label),
            "current_step": state["current_step"],
        }

        for key, message in state["issues"].items():
            if message:
                error[key] = message

        raise ValidationError(error)


@transaction.atomic
def post_project(user, project_id):
    project = owned_draft(user, project_id)

    require_step(project, "REVIEW_AND_POST")
    assert_personal_information_ready(user.person, user)

    issues = description_and_funding_issues(project)

    if not project.domain:
        issues["domain"] = _("Select a project domain.")

    if not str(project.currency or "").strip():
        issues["currency"] = _("Enter the project currency.")

    if issues:
        raise ValidationError(issues)

    proposal = current_proposal(project)

    if proposal is None:
        raise ValidationError({
            "proposal": _(
                "This project has no uploaded proposal. "
                "A proposal must be uploaded and prepared before posting."
            )
        })

    if not proposal_is_reader_ready(proposal):
        reasons = []

        if proposal.scan_status != ProjectProposalDocument.ScanStatus.CLEAN:
            scan_messages = {
                "NOT_SCANNED": _("Security scanning has not completed."),
                "UNAVAILABLE": _(
                    "The proposal has no successful security scan. "
                    "The configured scanner must be checked and "
                    "the proposal reprocessed."
                ),
                "ERROR": _(
                    "Security scanning failed. "
                    "Check the scanner configuration and processing log."
                ),
                "INFECTED": _(
                    "The scanner reported a threat or scan-limit alert. "
                    "This file cannot be posted."
                ),
            }

            reasons.append(
                scan_messages.get(
                    proposal.scan_status,
                    _("The proposal has not passed security scanning."),
                )
            )

        if (
            proposal.processing_status
            != ProjectProposalDocument.ProcessingStatus.READY
        ):
            reasons.append(
                _("Proposal preparation status: {status}.").format(
                    status=proposal.get_processing_status_display()
                )
            )

        page_numbers = list(
            proposal.pages.order_by("page_number").values_list(
                "page_number",
                flat=True,
            )
        )

        expected = list(range(1, proposal.page_count + 1))

        if proposal.page_count < 1 or page_numbers != expected:
            reasons.append(
                _(
                    "Reader pages are missing or incomplete: "
                    "{stored} stored page(s), {expected} expected."
                ).format(
                    stored=len(page_numbers),
                    expected=proposal.page_count,
                )
            )

        if not proposal.is_current:
            reasons.append(
                _("This proposal is not marked as the current prepared version.")
            )

        raise ValidationError({
            "proposal": _(
                "Your project was not posted.\n\n"
                "{reasons}\n\n"
                "Your saved project information remains available. "
                "Proposal preparation must complete successfully before posting."
            ).format(
                reasons="\n".join(f"- {reason}" for reason in reasons)
            )
        })

    if invitation_issue(project):
        raise ValidationError(
            {
                "expert_invitation": _(
                    "A valid pending or accepted Expert invitation is required."
                )
            }
        )

    project.status = Project.Status.POSTED
    project.posted_at = timezone.now()

    try:
        project.full_clean()
    except DjangoValidationError as exc:
        detail = (
            exc.message_dict
            if hasattr(exc, "message_dict")
            else {"non_field_errors": exc.messages}
        )
        raise ValidationError(detail) from exc

    project.save(
        update_fields=[
            "status",
            "posted_at",
            "updated_at",
        ]
    )

    return project
