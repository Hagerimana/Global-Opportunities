"""Project proposals, ownership, and implementation activities."""
import uuid
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _
from apps.documents.storage import get_private_document_storage
from apps.professional_profiles.models import ProfessionalDomain


def generate_project_reference():
    return f"PRJ-{uuid.uuid4().hex.upper()}"


class Project(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_EVALUATION = "UNDER_EVALUATION", "Under evaluation"
        SHORTLISTED = "SHORTLISTED", "Shortlisted"
        SELECTED = "SELECTED", "Selected"
        REJECTED = "REJECTED", "Rejected"
        FUNDED = "FUNDED", "Funded"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        SUSPENDED = "SUSPENDED", "Suspended"
        COMPLETED = "COMPLETED", "Completed"
        CLOSED = "CLOSED", "Closed"
        CANCELLED = "CANCELLED", "Cancelled"

    reference_number = models.CharField(max_length=100, unique=True, default=generate_project_reference, editable=False)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    problem_statement = models.TextField(blank=True)
    solution = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    expected_results = models.TextField(blank=True)
    domain = models.CharField(max_length=40, choices=ProfessionalDomain.choices, blank=True)
    project_type = models.CharField(max_length=50, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    target_population = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    total_budget = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    requested_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    own_contribution = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default="BIF")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    verified_at = models.DateTimeField(null=True, blank=True, editable=False)
    posted_at = models.DateTimeField(null=True, blank=True, editable=False)
    # Authoritative project-level progress, not an unweighted activity average.
    # Unknown legacy progress remains NULL rather than being invented.
    progress_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(progress_percentage__isnull=True) | Q(progress_percentage__gte=0, progress_percentage__lte=100),
                name="project_progress_between_zero_and_hundred",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}
        if self.start_date is not None and self.end_date is not None and self.start_date > self.end_date:
            errors["end_date"] = _("Project end date must be on or after its start date.")
        amounts = {"total_budget": self.total_budget, "requested_amount": self.requested_amount, "own_contribution": self.own_contribution}
        for field, amount in amounts.items():
            if amount is not None and amount < 0:
                errors[field] = _("Amounts cannot be negative.")
        if all(amount is not None for amount in amounts.values()):
            if self.requested_amount + self.own_contribution != self.total_budget:
                errors["total_budget"] = _(
                    "Total budget must equal requested funding plus own contribution."
                )
        if self.progress_percentage is not None and not 0 <= self.progress_percentage <= 100:
            errors["progress_percentage"] = _("Progress must be between 0 and 100.")
        if errors:
            raise ValidationError(errors)


class ProjectOwner(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="owners")
    person = models.ForeignKey("persons.Person", on_delete=models.CASCADE, null=True, blank=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, null=True, blank=True)
    role = models.CharField(max_length=100)
    is_primary = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    def clean(self):
        super().clean()
        if bool(self.person_id) == bool(self.organization_id):
            raise ValidationError(
                _("Provide exactly one project owner: person or organization.")
            )


class ProjectActivity(models.Model):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        DELAYED = "DELAYED", "Delayed"
        CANCELLED = "CANCELLED", "Cancelled"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="activities")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    planned_start = models.DateField()
    planned_end = models.DateField()
    actual_start = models.DateField(null=True, blank=True)
    actual_end = models.DateField(null=True, blank=True)
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.progress_percentage > 100:
            raise ValidationError(_("Progress may not exceed 100%."))


def private_project_proposal_path(instance, filename):
    return f"projects/{instance.project_id}/originals/{uuid.uuid4().hex}.pdf"


def private_project_page_path(instance, filename):
    return f"projects/rendered/{instance.proposal_id}/{uuid.uuid4().hex}.png"


class ProjectProposalDocument(models.Model):
    class ProcessingStatus(models.TextChoices):
        PENDING = "PENDING", "Awaiting processing"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready for protected viewing"
        REJECTED = "REJECTED", "Rejected"
        FAILED = "FAILED", "Processing failed"
    class ScanStatus(models.TextChoices):
        NOT_SCANNED = "NOT_SCANNED", "Not scanned"
        CLEAN = "CLEAN", "No threat detected by configured scanner"
        INFECTED = "INFECTED", "Threat detected"
        ERROR = "ERROR", "Scan failed"
        UNAVAILABLE = "UNAVAILABLE", "Scanner unavailable"
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="proposal_documents")
    uploaded_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="project_proposals_uploaded")
    version = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    original_file = models.FileField(upload_to=private_project_proposal_path, storage=get_private_document_storage, max_length=500)
    original_filename = models.CharField(max_length=255)
    detected_mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    sha256 = models.CharField(max_length=64, blank=True)
    page_count = models.PositiveIntegerField(default=0)
    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.PENDING)
    scan_status = models.CharField(max_length=20, choices=ScanStatus.choices, default=ScanStatus.NOT_SCANNED)
    is_current = models.BooleanField(default=False)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_error_code = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(fields=["project", "version"], name="project_proposal_unique_version"),
            models.UniqueConstraint(fields=["project"], condition=Q(is_current=True), name="project_one_current_proposal"),
            models.CheckConstraint(condition=Q(version__gte=1), name="project_proposal_version_positive"),
            models.CheckConstraint(condition=Q(file_size__gt=0), name="project_proposal_size_positive"),
            models.CheckConstraint(condition=Q(is_current=False) | Q(processing_status="READY"), name="project_current_proposal_ready"),
            models.CheckConstraint(condition=~Q(processing_status="READY") | Q(page_count__gt=0), name="project_ready_proposal_has_pages"),
            models.CheckConstraint(condition=Q(is_current=False) | ~Q(scan_status="INFECTED"), name="project_infected_not_current"),
        ]
    def clean(self):
        super().clean()
        if self.project_id and self.uploaded_by_user_id:
            if self.project.created_by_user_id != self.uploaded_by_user_id:
                raise ValidationError(
                    {
                        "uploaded_by_user": _(
                            "Only the project creator may upload its proposal "
                            "through this workflow."
                        )
                    }
                )
    def __str__(self):
        return f"Project {self.project_id}: proposal version {self.version}"


class ProjectProposalPage(models.Model):
    proposal = models.ForeignKey(ProjectProposalDocument, on_delete=models.PROTECT, related_name="pages")
    page_number = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    image = models.FileField(upload_to=private_project_page_path, storage=get_private_document_storage, max_length=500)
    width = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    height = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["page_number"]
        constraints = [
            models.UniqueConstraint(fields=["proposal", "page_number"], name="project_proposal_unique_page"),
            models.CheckConstraint(condition=Q(page_number__gte=1), name="project_page_number_positive"),
            models.CheckConstraint(condition=Q(width__gt=0) & Q(height__gt=0), name="project_page_dimensions_positive"),
        ]
    def __str__(self):
        return f"Proposal {self.proposal_id}: page {self.page_number}"


class ProjectExpertInvitation(models.Model):
    class Status(models.TextChoices):
        SENT = "SENT", "Awaiting response"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="expert_invitations")
    expert_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="project_expert_invitations")
    invited_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="project_expert_invitations_sent")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    sent_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    access_revoked_at = models.DateTimeField(null=True, blank=True)
    access_revocation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=~Q(expert_user=F("invited_by_user")), name="project_expert_no_self_invite"),
            models.UniqueConstraint(fields=["project", "expert_user"], condition=Q(status__in=["SENT", "ACCEPTED"], access_revoked_at__isnull=True), name="project_unique_live_expert_invite"),
        ]
    def clean(self):
        super().clean()
        errors = {}
        if self.project_id and self.invited_by_user_id:
            if self.project.created_by_user_id != self.invited_by_user_id:
                errors["invited_by_user"] = _(
                    "Only the project creator may send an Expert invitation "
                    "through this workflow."
                )
        if self.expert_user_id:
            expert = self.expert_user
            if expert.account_type != "PERSONAL" or expert.person_id is None or not expert.is_active or expert.status != "ACTIVE" or expert.email_verified_at is None:
                errors["expert_user"] = _(
                    "Choose an active, email-verified personal account."
                )
            elif not expert.professional_profiles.filter(profile_type="EXPERT", verification_status="VERIFIED", is_active=True).exists():
                errors["expert_user"] = _(
                    "The invited account must have an active, approved "
                    "Expert profile."
                )
        if errors:
            raise ValidationError(errors)
    def __str__(self):
        return f"Project {self.project_id}: Expert invitation {self.pk}"


class ProjectExpertInvitationEvent(models.Model):
    class EventType(models.TextChoices):
        SENT = "SENT", "Invitation recorded"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"
    invitation = models.ForeignKey(ProjectExpertInvitation, on_delete=models.PROTECT, related_name="events")
    actor_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, null=True, blank=True, related_name="project_expert_invitation_events")
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["created_at", "pk"]
