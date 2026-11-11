"""Opportunity discovery: one generic table plus two specialisations.

The design goal is to avoid two independent sets of near-identical records.
`Opportunity` holds everything both kinds share (provider, title, description,
location, dates, status) so the frontend can run a single search across funding
opportunities and calls for projects. Type-specific fields live in a
one-to-one child row:

    Opportunity 1 ──1 FundingOpportunity   (opportunity_type = FUNDING)
    Opportunity 1 ──1 CallForProjects      (opportunity_type = CALL_FOR_PROJECTS,
                                           defined in the calls app)

A discovery query therefore touches one table; a detail page follows the
one-to-one link for the extra fields.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class Opportunity(models.Model):
    """Base record for anything an applicant can discover and apply to."""

    class Type(models.TextChoices):
        """Which specialisation row this opportunity has."""

        FUNDING = "FUNDING"
        CALL_FOR_PROJECTS = "CALL_FOR_PROJECTS"

    class Status(models.TextChoices):
        """Publication and availability state.

        DRAFT and PUBLISHED are editorial states; OPEN/CLOSED describe whether
        applications are accepted right now; CANCELLED and ARCHIVED are terminal.
        """

        DRAFT = "DRAFT"
        PUBLISHED = "PUBLISHED"
        OPEN = "OPEN"
        CLOSED = "CLOSED"
        CANCELLED = "CANCELLED"
        ARCHIVED = "ARCHIVED"

    # The organisation publishing the opportunity. PROTECT so an organisation
    # that has published opportunities cannot simply be deleted.
    provider_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="opportunities"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Drives which specialisation applies and lets the frontend offer a type
    # filter.
    opportunity_type = models.CharField(max_length=25, choices=Type.choices)

    # Denormalised onto the base table (it is not in the spec's field list) so
    # the sector filter is a plain indexed column instead of a join through the
    # specialisation. Acceptable because sector is used for search on the list
    # view, not as a source of truth for eligibility.
    sector = models.CharField(max_length=100, blank=True)

    location = models.CharField(max_length=255, blank=True)
    # True when the opportunity accepts remote applicants.
    online = models.BooleanField(default=False)

    # The window during which applications are accepted.
    application_start_date = models.DateField()
    application_deadline = models.DateField()

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    # The user who created the record. PROTECT preserves accountability.
    created_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Reject an inverted application window.

        Called by Model.full_clean(); DRF does not call it automatically, which
        is why the serializer repeats this check.
        """
        if self.application_start_date > self.application_deadline:
            raise ValidationError(
                _("Application start date must be on or before the deadline.")
            )


class FundingOpportunity(models.Model):
    """Funding-specific fields for an Opportunity of type FUNDING.

    One-to-one from Opportunity, so a funding opportunity can never exist
    without its parent record.
    """

    class FundingType(models.TextChoices):
        """How the money is given."""

        GRANT = "GRANT"
        DONATION = "DONATION"

    # limit_choices_to restricts admin dropdowns to parent rows already typed
    # FUNDING, which stops an admin attaching funding details to a call.
    opportunity = models.OneToOneField(
        Opportunity,
        on_delete=models.CASCADE,
        related_name="funding_details",
        limit_choices_to={"opportunity_type": "FUNDING"},
    )
    reference_number = models.CharField(max_length=100, unique=True)
    funding_type = models.CharField(max_length=15, choices=FundingType.choices)

    # Money is Decimal, never float, to avoid binary rounding drift. 18 digits
    # with 2 decimal places covers large multi-currency programme budgets.
    minimum_amount = models.DecimalField(max_digits=18, decimal_places=2)
    maximum_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="BIF")

    # A list of sectors this funding targets. JSONField rather than a join
    # table because the values are only ever read as a set for display and
    # filtering, never individually updated.
    target_sectors = models.JSONField(default=list)
    target_population = models.TextField(blank=True)

    def clean(self):
        """Reject a minimum that exceeds the maximum."""
        if self.minimum_amount > self.maximum_amount:
            raise ValidationError(
                _("Minimum funding cannot exceed maximum funding.")
            )


class FundingEligibilityCriterion(models.Model):
    """One eligibility rule attached to a funding opportunity.

    Applicants read these to work out whether they qualify before spending time
    on a proposal, so they are first-class rows rather than free text.
    """

    class Type(models.TextChoices):
        """What dimension the rule constrains."""

        SECTOR = "SECTOR"
        LOCATION = "LOCATION"
        ORGANIZATION_TYPE = "ORGANIZATION_TYPE"
        PROJECT_TYPE = "PROJECT_TYPE"
        EXPERIENCE = "EXPERIENCE"
        BUDGET = "BUDGET"
        TARGET_POPULATION = "TARGET_POPULATION"
        LEGAL_STATUS = "LEGAL_STATUS"
        DOCUMENT = "DOCUMENT"
        OTHER = "OTHER"

    funding_opportunity = models.ForeignKey(
        FundingOpportunity, on_delete=models.CASCADE, related_name="eligibility_criteria"
    )
    criterion_type = models.CharField(max_length=25, choices=Type.choices)
    name = models.CharField(max_length=255)
    description = models.TextField()
    # True when failing this rule disqualifies the applicant outright.
    mandatory = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
