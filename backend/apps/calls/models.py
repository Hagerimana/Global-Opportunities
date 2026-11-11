"""Calls for projects: the invitation side of the opportunity lifecycle.

A call is the specialisation of an Opportunity for organisations that run a
competitive, deadline-bound selection process. Where a funding opportunity simply
offers money, a call defines a budget, a timeline, eligibility rules, and the
weighted criteria applications are scored against.

This app currently holds models only. There is no serializer, view, or URL
router, so `/api/calls/` does not exist yet even though the models are ready for
it.
"""

from django.db import models


class CallForProjects(models.Model):
    """Call-specific fields for an Opportunity of type CALL_FOR_PROJECTS.

    The shared fields (title, description, location, application deadline,
    status) live on the parent Opportunity row. Only what is specific to a call
    is duplicated here.
    """

    # One-to-one from the parent, restricted to parent rows typed
    # CALL_FOR_PROJECTS so a call cannot be attached to a funding opportunity.
    opportunity = models.OneToOneField(
        "opportunities.Opportunity",
        on_delete=models.CASCADE,
        related_name="call_details",
        limit_choices_to={"opportunity_type": "CALL_FOR_PROJECTS"},
    )

    # The public reference applicants quote in correspondence. UNIQUE.
    reference_number = models.CharField(max_length=100, unique=True)

    # What the funder wants the funded work to achieve. Free text, because
    # objectives are narrative rather than categorical.
    objectives = models.TextField()

    # Money. Decimal, never float. budget_total is the whole envelope;
    # minimum_funding and maximum_funding bound an individual request.
    budget_total = models.DecimalField(max_digits=18, decimal_places=2)
    minimum_funding = models.DecimalField(max_digits=18, decimal_places=2)
    maximum_funding = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="BIF")

    # --- Timeline -------------------------------------------------------------
    # launch_date is when the call opens; the closing date is the parent's
    # application_deadline, so it is not repeated here.
    launch_date = models.DateField()
    # When scoring begins, and when applicants are told the outcome. Nullable
    # because a funder publishes these only once confirmed.
    evaluation_start_date = models.DateField(null=True, blank=True)
    result_date = models.DateField(null=True, blank=True)

    # NOTE: this model has no `status` field. Call-specific states from the
    # specification (UNDER_EVALUATION, RESULTS_PUBLISHED) therefore cannot be
    # represented; status is inherited from Opportunity, which only offers
    # DRAFT/PUBLISHED/OPEN/CLOSED/CANCELLED/ARCHIVED.


class EligibilityCriterion(models.Model):
    """One pass/fail entry requirement for a call.

    Applicants check these before submitting, so they are queryable rows rather
    than a paragraph of prose.
    """

    call = models.ForeignKey(
        CallForProjects, on_delete=models.CASCADE, related_name="eligibility_criteria"
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    # True when failing this criterion makes the application ineligible.
    mandatory = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class EvaluationCriterion(models.Model):
    """One scored dimension of a call, with the weight it carries.

    Splitting the criteria out of the call means an evaluator scores a
    application criterion by criterion, and a weighted total can be computed
    without re-parsing a document.
    """

    call = models.ForeignKey(
        CallForProjects, on_delete=models.CASCADE, related_name="evaluation_criteria"
    )
    name = models.CharField(max_length=255)
    description = models.TextField()

    # Relative importance of this criterion. Decimal because a 2.5% weighting is
    # legitimate. Nothing enforces that all weights sum to 100.
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    # The ceiling an evaluator may award for this criterion; EvaluationScore
    # validates against it.
    maximum_score = models.DecimalField(max_digits=7, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
