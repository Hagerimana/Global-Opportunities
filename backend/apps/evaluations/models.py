"""Evaluation: an independent scorecard for one application.

An `Evaluation` is one evaluator's assignment for one application. It owns a
set of `EvaluationScore` rows, one per criterion defined by the call.

This app holds models only: no serializer, view, or URL router exists yet, so
`/api/evaluations/` is not reachable and nothing currently assigns evaluations
to reviewers.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class Evaluation(models.Model):
    """One evaluator's review of one application."""

    application = models.ForeignKey(
        "applications.Application", on_delete=models.CASCADE, related_name="evaluations"
    )
    # The reviewer. PROTECT so a completed evaluation stays attributable even if
    # the evaluator's account is closed.
    evaluator_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    # Stamped when the evaluator opens the review and when they submit it. Both
    # NULL while the review is untouched.
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Sum of the individual criterion scores. Decimal; NULL until completed.
    total_score = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )

    # The evaluator's overall narrative recommendation.
    general_comment = models.TextField(blank=True)

    # NOTE: a plain CharField with no `choices`. The specification defines four
    # states -- ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED -- but only the
    # default is enforced, so any string can currently be stored.
    status = models.CharField(max_length=20, default="ASSIGNED")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class EvaluationScore(models.Model):
    """The evaluator's mark for a single evaluation criterion."""

    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="scores"
    )
    # The criterion being scored, defined by the call. PROTECT: published
    # criteria must not disappear and invalidate historical scores.
    criterion = models.ForeignKey(
        "calls.EvaluationCriterion", on_delete=models.PROTECT
    )

    # Decimal, never float. Bounded above by the criterion's maximum_score,
    # which `clean()` checks.
    score = models.DecimalField(max_digits=7, decimal_places=2)
    # Justification for this particular mark.
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # An evaluator scores each criterion once; re-submitting updates the
            # existing row rather than adding a duplicate.
            models.UniqueConstraint(
                fields=["evaluation", "criterion"], name="unique_evaluation_score"
            )
        ]

    def clean(self):
        """Reject a score outside 0..criterion.maximum_score.

        Reading the ceiling from the related criterion keeps the bound in one
        place instead of duplicating it on every score row.
        """
        if self.score < 0 or self.score > self.criterion.maximum_score:
            raise ValidationError(_("Score must be within the criterion maximum."))
