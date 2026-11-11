"""Professional profiles, applications, and application history.

Identity remains in User and Person.

Applications contain proposed information. Approved profiles contain the
effective information used by the platform.

Document requirements and document reviews will be added separately.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _


class ProfileType(models.TextChoices):
    MENTOR = "MENTOR", _("Mentor")
    EXPERT = "EXPERT", _("Expert")
    TRAINER = "TRAINER", _("Trainer")


class ProfessionalDomain(models.TextChoices):
    AGRICULTURE = "AGRICULTURE", _("Agriculture")
    BUSINESS = "BUSINESS", _("Business")
    FINANCE = "FINANCE", _("Finance")
    FUNDRAISING = "FUNDRAISING", _("Fundraising")
    PROJECT_MANAGEMENT = "PROJECT_MANAGEMENT", _("Project management")
    TECHNOLOGY = "TECHNOLOGY", _("Technology")
    ENGINEERING = "ENGINEERING", _("Engineering")
    EDUCATION = "EDUCATION", _("Education")
    HEALTH = "HEALTH", _("Health")
    ENVIRONMENT = "ENVIRONMENT", _("Environment")
    SOCIAL_DEVELOPMENT = "SOCIAL_DEVELOPMENT", _("Social development")
    COMMUNITY_DEVELOPMENT = (
        "COMMUNITY_DEVELOPMENT",
        _("Community development"),
    )
    GOVERNANCE = "GOVERNANCE", _("Governance")
    LAW = "LAW", _("Law")
    RESEARCH = "RESEARCH", _("Research")
    MARKETING = "MARKETING", _("Marketing")
    HUMAN_RESOURCES = "HUMAN_RESOURCES", _("Human resources")
    MONITORING_EVALUATION = (
        "MONITORING_EVALUATION",
        _("Monitoring and evaluation"),
    )
    LOGISTICS = "LOGISTICS", _("Logistics")
    CONSTRUCTION = "CONSTRUCTION", _("Construction")
    ENERGY = "ENERGY", _("Energy")
    ARTS_CULTURE = "ARTS_CULTURE", _("Arts and culture")
    LANGUAGES = "LANGUAGES", _("Languages")
    OTHER = "OTHER", _("Other")


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def validate_personal_account(user):
    """Validate eligibility for a personal professional profile."""

    if user.account_type != "PERSONAL" or user.person_id is None:
        raise ValidationError(
            {
                "user": (
                    _(
                        "Professional profiles require a personal account "
                        "with a linked person profile."
                    )
                )
            }
        )


class ProfessionalProfile(TimeStampedModel):
    """Approved/effective professional information for one profile type.

    A user may retain records for different types, but at most one
    record may be active.
    """

    class Availability(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        BUSY = "BUSY", "Busy"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"

    class Verification(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="professional_profiles",
    )

    profile_type = models.CharField(
        max_length=20,
        choices=ProfileType.choices,
    )

    domain = models.CharField(
        max_length=40,
        choices=ProfessionalDomain.choices,
    )

    biography = models.TextField(blank=True)
    qualifications = models.TextField(blank=True)
    years_experience = models.PositiveSmallIntegerField(default=0)

    # Expert-specific information.
    professional_title = models.CharField(
        max_length=255,
        blank=True,
    )

    # Trainer-specific information.
    teaching_methodology = models.TextField(blank=True)

    availability = models.CharField(
        max_length=20,
        choices=Availability.choices,
        default=Availability.UNAVAILABLE,
    )

    verification_status = models.CharField(
        max_length=20,
        choices=Verification.choices,
        default=Verification.PENDING,
    )

    is_active = models.BooleanField(default=False)

    activated_at = models.DateTimeField(null=True, blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "profile_type"],
                name="pp_unique_user_profile_type",
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_active=True),
                name="pp_one_active_profile_per_user",
            ),
            models.CheckConstraint(
                condition=(Q(is_active=False) | Q(verification_status="VERIFIED")),
                name="pp_active_requires_verified",
            ),
            models.CheckConstraint(
                condition=Q(profile_type__in=["MENTOR", "EXPERT", "TRAINER"]),
                name="pp_valid_profile_type",
            ),
        ]

    def clean(self):
        super().clean()

        if self.user_id:
            validate_personal_account(self.user)

    def __str__(self):
        return f"{self.user_id}: {self.get_profile_type_display()}"


class ProfessionalProfileRequest(TimeStampedModel):
    """Proposed information awaiting submission or approval.

    Editing this record does not modify an existing approved profile.
    """

    class RequestType(models.TextChoices):
        INITIAL = "INITIAL", "Initial application"
        UPDATE = "UPDATE", "Profile update"
        PROFILE_SWITCH = "PROFILE_SWITCH", "Profile switch"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_REVIEW = "UNDER_REVIEW", "Under review"
        NEEDS_CORRECTION = "NEEDS_CORRECTION", "Needs correction"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="professional_profile_requests",
    )

    request_type = models.CharField(
        max_length=20,
        choices=RequestType.choices,
        default=RequestType.INITIAL,
    )

    requested_role = models.CharField(
        max_length=20,
        choices=ProfileType.choices,
    )

    previous_profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="change_requests",
    )

    resulting_profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_requests",
    )

    domain = models.CharField(
        max_length=40,
        choices=ProfessionalDomain.choices,
        blank=True,
    )

    motivation = models.TextField(blank=True)
    qualifications = models.TextField(blank=True)
    biography = models.TextField(blank=True)

    years_experience = models.PositiveSmallIntegerField(default=0)

    professional_title = models.CharField(
        max_length=255,
        blank=True,
    )

    teaching_methodology = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    reviewer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="professional_requests_reviewed",
    )

    review_comment = models.TextField(blank=True)

    # Distinguishes simulated development approval from human review.
    development_auto_approved = models.BooleanField(default=False)

    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(Q(reviewer_user__isnull=True) | ~Q(reviewer_user=F("user"))),
                name="pp_request_no_self_reviewer",
            ),
            models.CheckConstraint(
                condition=Q(requested_role__in=["MENTOR", "EXPERT", "TRAINER"]),
                name="pp_request_valid_role",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "status"],
                name="pp_request_user_status_idx",
            ),
            models.Index(
                fields=["status", "created_at"],
                name="pp_request_review_queue_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if self.user_id:
            validate_personal_account(self.user)

        if self.previous_profile_id:
            previous = self.previous_profile

            if previous.user_id != self.user_id:
                raise ValidationError(
                    {
                        "previous_profile": (
                            _(
                                "The previous profile must belong "
                                "to this applicant."
                            )
                        )
                    }
                )

        if self.resulting_profile_id:
            result = self.resulting_profile

            if result.user_id != self.user_id:
                raise ValidationError(
                    {
                        "resulting_profile": (
                            _(
                                "The resulting profile must belong "
                                "to this applicant."
                            )
                        )
                    }
                )

    def __str__(self):
        return (
            f"Request {self.pk}: "
            f"{self.get_requested_role_display()} "
            f"({self.get_status_display()})"
        )


class ProfessionalProfileRequestEvent(models.Model):
    """Application history written by the workflow service.

    Snapshots preserve submitted and approved information even when
    the request or effective profile is subsequently updated.
    """

    class EventType(models.TextChoices):
        CREATED = "CREATED", "Created"
        DRAFT_UPDATED = "DRAFT_UPDATED", "Draft updated"
        SUBMITTED = "SUBMITTED", "Submitted"
        REVIEW_STARTED = "REVIEW_STARTED", "Review started"
        CORRECTIONS_REQUESTED = (
            "CORRECTIONS_REQUESTED",
            "Corrections requested",
        )
        RESUBMITTED = "RESUBMITTED", "Resubmitted"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"
        DEVELOPMENT_APPROVED = (
            "DEVELOPMENT_APPROVED",
            "Development auto-approved",
        )

    profile_request = models.ForeignKey(
        ProfessionalProfileRequest,
        on_delete=models.PROTECT,
        related_name="events",
    )

    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="professional_request_events",
    )

    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
    )

    from_status = models.CharField(
        max_length=20,
        choices=ProfessionalProfileRequest.Status.choices,
        blank=True,
    )

    to_status = models.CharField(
        max_length=20,
        choices=ProfessionalProfileRequest.Status.choices,
    )

    comment = models.TextField(blank=True)

    # Application/profile values only. No file contents, passwords,
    # tokens, or public download URLs belong in this field.
    snapshot = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "pk"]

    def __str__(self):
        return f"Request {self.profile_request_id}: " f"{self.get_event_type_display()}"


class ProfileDocumentType(TimeStampedModel):
    """Administrator-managed document categories."""

    code = models.SlugField(
        max_length=60,
        unique=True,
        help_text="Stable identifier, for example CV or PROOF_OF_EXPERIENCE.",
    )

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProfileDocumentRequirement(TimeStampedModel):
    """Configurable document requirements for new applications."""

    profile_type = models.CharField(
        max_length=20,
        choices=ProfileType.choices,
    )

    document_type = models.ForeignKey(
        ProfileDocumentType,
        on_delete=models.PROTECT,
        related_name="requirements",
    )

    # Stable within a profile type. Several requirements may use
    # the same document type, so document_type is not the identifier.
    code = models.SlugField(max_length=80)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    is_mandatory = models.BooleanField(default=True)
    is_conditional = models.BooleanField(default=False)

    # Instructions for evaluating applicability, not executable code.
    condition_rule = models.TextField(blank=True)

    # MIME types, for example ["application/pdf", "image/jpeg"].
    # The service will validate this configuration and file content.
    accepted_file_types = models.JSONField(default=list)

    max_file_size = models.PositiveBigIntegerField(
        help_text="Maximum permitted file size in bytes.",
    )

    validity_required = models.BooleanField(default=False)

    allow_not_applicable = models.BooleanField(
        default=False,
        help_text=("Whether an authorized reviewer may grant a documented exception."),
    )

    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["profile_type", "display_order", "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile_type", "code"],
                name="pp_req_unique_type_code",
            ),
            models.CheckConstraint(
                condition=Q(profile_type__in=["MENTOR", "EXPERT", "TRAINER"]),
                name="pp_doc_req_valid_type",
            ),
            models.CheckConstraint(
                condition=Q(max_file_size__gt=0),
                name="pp_doc_req_positive_size",
            ),
        ]

    def clean(self):
        super().clean()

        errors = {}

        if self.is_conditional and not self.condition_rule.strip():
            errors["condition_rule"] = (
                "Explain when this conditional requirement applies."
            )

        mime_types = self.accepted_file_types

        if (
            not isinstance(mime_types, list)
            or not mime_types
            or any(
                not isinstance(value, str) or "/" not in value or not value.strip()
                for value in mime_types
            )
        ):
            errors["accepted_file_types"] = _(
                "Provide a non-empty list of permitted MIME types."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.get_profile_type_display()}: {self.name}"


class ProfessionalProfileRequestRequirement(TimeStampedModel):
    """A requirement and its applicability for a specific application.

    The workflow service copies the source configuration into
    configuration_snapshot when the application requirements are created.
    """

    class Applicability(models.TextChoices):
        UNASSESSED = "UNASSESSED", "Not yet assessed"
        REQUIRED = "REQUIRED", "Required"
        OPTIONAL = "OPTIONAL", "Optional"
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"

    profile_request = models.ForeignKey(
        ProfessionalProfileRequest,
        on_delete=models.PROTECT,
        related_name="document_requirements",
    )

    requirement = models.ForeignKey(
        ProfileDocumentRequirement,
        on_delete=models.PROTECT,
        related_name="application_requirements",
    )

    # Stores the applicable name, type, mandatory/conditional flags,
    # condition instructions, MIME types, size limit, validity rule,
    # and exception policy.
    configuration_snapshot = models.JSONField(default=dict)

    applicability = models.CharField(
        max_length=20,
        choices=Applicability.choices,
        default=Applicability.UNASSESSED,
    )

    applicability_reason = models.TextField(blank=True)

    assessed_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="professional_requirements_assessed",
    )

    assessed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile_request", "requirement"],
                name="pp_unique_request_requirement",
            ),
            models.CheckConstraint(
                condition=(
                    ~Q(applicability="NOT_APPLICABLE")
                    | (
                        Q(assessed_by_user__isnull=False)
                        & Q(assessed_at__isnull=False)
                        & ~Q(applicability_reason="")
                    )
                ),
                name="pp_na_requires_assessment",
            ),
        ]

    def clean(self):
        super().clean()

        if self.profile_request_id and self.requirement_id:
            if self.profile_request.requested_role != self.requirement.profile_type:
                raise ValidationError(
                    {
                        "requirement": (
                            _(
                                "This requirement belongs to a different "
                                "professional profile type."
                            )
                        )
                    }
                )

        if self.applicability == self.Applicability.NOT_APPLICABLE:
            if not self.applicability_reason.strip():
                raise ValidationError(
                    {
                        "applicability_reason": (
                            _(
                                "Record the reason this requirement "
                                "does not apply."
                            )
                        )
                    }
                )

    def __str__(self):
        return (
            f"Request {self.profile_request_id}: " f"requirement {self.requirement_id}"
        )


class ProfessionalProfileDocument(TimeStampedModel):
    """An existing uploaded document submitted against a requirement.

    Replacements create a new link record rather than overwriting
    the previous submission.
    """

    class Verification(models.TextChoices):
        PENDING = "PENDING", "Pending"
        UNDER_REVIEW = "UNDER_REVIEW", "Under review"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    request_requirement = models.ForeignKey(
        ProfessionalProfileRequestRequirement,
        on_delete=models.PROTECT,
        related_name="documents",
    )

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.PROTECT,
        related_name="professional_profile_submissions",
    )

    original_filename = models.CharField(max_length=255)

    document_reference = models.CharField(
        max_length=255,
        blank=True,
    )

    issued_by = models.CharField(max_length=255, blank=True)
    issued_at = models.DateField(null=True, blank=True)

    # File size, MIME type, file storage reference, uploader, and
    # expiry are read from the shared Document record.

    verification_status = models.CharField(
        max_length=20,
        choices=Verification.choices,
        default=Verification.PENDING,
    )

    is_current = models.BooleanField(default=True)

    reviewer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="professional_documents_reviewed",
    )

    review_comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["request_requirement", "document"],
                name="pp_unique_requirement_document",
            ),
            models.CheckConstraint(
                condition=(~Q(verification_status="SUPERSEDED") | Q(is_current=False)),
                name="pp_superseded_not_current",
            ),
        ]

    def clean(self):
        super().clean()

        if self.request_requirement_id and self.document_id:
            applicant = self.request_requirement.profile_request.user

            if (
                applicant.person_id is None
                or self.document.owner_person_id != applicant.person_id
                or self.document.owner_organization_id is not None
            ):
                raise ValidationError(
                    {
                        "document": (
                            _(
                                "The document must belong exclusively "
                                "to the applicant's person profile."
                            )
                        )
                    }
                )

        if self.reviewer_user_id and self.request_requirement_id:
            applicant_id = self.request_requirement.profile_request.user_id

            if self.reviewer_user_id == applicant_id:
                raise ValidationError(
                    {
                        "reviewer_user": _(
                            "Applicants cannot review their own documents."
                        )
                    }
                )

    def __str__(self):
        return (
            f"Requirement {self.request_requirement_id}: " f"{self.original_filename}"
        )


class ProfessionalProfileDocumentReview(models.Model):
    """Historical verification decisions for a submitted document."""

    class Decision(models.TextChoices):
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        NEEDS_CORRECTION = "NEEDS_CORRECTION", "Needs correction"

    profile_document = models.ForeignKey(
        ProfessionalProfileDocument,
        on_delete=models.PROTECT,
        related_name="reviews",
    )

    reviewer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="professional_document_review_history",
    )

    decision = models.CharField(
        max_length=20,
        choices=Decision.choices,
    )

    comment = models.TextField(blank=True)

    # A simulated development decision must not be presented
    # as a genuine human verification.
    development_auto_verified = models.BooleanField(default=False)

    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["reviewed_at", "pk"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(reviewer_user__isnull=False) | Q(development_auto_verified=True)
                ),
                name="pp_doc_review_requires_actor",
            ),
            models.CheckConstraint(
                condition=(
                    ~Q(decision__in=["REJECTED", "NEEDS_CORRECTION"]) | ~Q(comment="")
                ),
                name="pp_doc_rejection_has_reason",
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.decision
            in [
                self.Decision.REJECTED,
                self.Decision.NEEDS_CORRECTION,
            ]
            and not self.comment.strip()
        ):
            raise ValidationError(
                {"comment": _("Explain what is wrong with the document.")}
            )

        if self.reviewer_user_id and self.profile_document_id:
            applicant_id = (
                self.profile_document.request_requirement.profile_request.user_id
            )

            if self.reviewer_user_id == applicant_id:
                raise ValidationError(
                    {
                        "reviewer_user": _(
                            "Applicants cannot review their own documents."
                        )
                    }
                )

    def __str__(self):
        return (
            f"Document submission {self.profile_document_id}: "
            f"{self.get_decision_display()}"
        )
