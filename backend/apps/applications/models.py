"""Applications: the link between a call and a project, plus the decision.

Submitting a project to a call creates one Application row. It then moves
through eligibility review, evaluation, shortlisting, and a final decision, each
of which is reflected in its `status`.
"""

from django.db import models


class Application(models.Model):
    """One project's bid for one call."""

    class Status(models.TextChoices):
        """Where the application sits in the selection process.

        DRAFT and WITHDRAWN are applicant-side states; ELIGIBILITY_REVIEW
        through REJECTED are decision-side states.
        """

        DRAFT = "DRAFT"
        SUBMITTED = "SUBMITTED"
        ELIGIBILITY_REVIEW = "ELIGIBILITY_REVIEW"
        ELIGIBLE = "ELIGIBLE"
        INELIGIBLE = "INELIGIBLE"
        UNDER_EVALUATION = "UNDER_EVALUATION"
        SHORTLISTED = "SHORTLISTED"
        SELECTED = "SELECTED"
        REJECTED = "REJECTED"
        WITHDRAWN = "WITHDRAWN"

    # The call being applied to. PROTECT: an application must not vanish because
    # a call record was removed.
    call = models.ForeignKey(
        "calls.CallForProjects", on_delete=models.PROTECT, related_name="applications"
    )
    # The project being proposed. PROTECT for the same reason.
    project = models.ForeignKey(
        "projects.Project", on_delete=models.PROTECT, related_name="applications"
    )

    # Who pressed submit. PROTECT keeps accountability for the record.
    submitted_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    # Set when the applicant moves the application out of DRAFT. NULL while the
    # application is still being written.
    submitted_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=25, choices=Status.choices, default=Status.DRAFT
    )

    # The aggregated score after evaluation. Decimal; NULL until scored.
    final_score = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )

    # Denormalised copy of the SelectionDecision outcome, kept here so a list of
    # applications can be rendered without a join on every row.
    decision = models.CharField(max_length=20, blank=True)
    decision_date = models.DateField(null=True, blank=True)
    decision_comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # A project may be submitted to a given call only once. Without this
            # an applicant could submit the same proposal repeatedly and
            # overwhelm evaluation.
            models.UniqueConstraint(
                fields=["call", "project"], name="unique_application_per_call_project"
            )
        ]


class SelectionDecision(models.Model):
    """The formal outcome recorded against an application.

    NOTE: this is a OneToOneField, so an application can hold at most one
    decision. The specification's relationship table calls for one-to-many
    (APPLICATION 1 N SELECTION_DECISION), which would preserve a history of
    revised decisions.
    """

    application = models.OneToOneField(
        Application, on_delete=models.CASCADE, related_name="selection_decision"
    )

    # Inline choices rather than a nested TextChoices class, because this enum is
    # used in exactly one place.
    decision = models.CharField(
        max_length=15,
        choices=[
            ("SELECTED", "Selected"),
            ("REJECTED", "Rejected"),
            ("WAITLISTED", "Waitlisted"),
        ],
    )

    decision_date = models.DateField()
    # Why the decision was taken. Required, so a rejection is always explained.
    decision_reason = models.TextField()

    # The administrator or committee member who made the call. PROTECT: a
    # decision must remain attributable.
    decided_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
