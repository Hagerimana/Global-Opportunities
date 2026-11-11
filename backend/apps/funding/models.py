"""The money chain: Funding -> Disbursement -> Payment.

This module holds the platform's financial rules, and they are the strictest
code in the project. Two principles are applied without exception:

1. Money is `Decimal`, never `float`. Binary floating point cannot represent
   0.10 exactly, and repeated additions of disbursement amounts would drift.
2. Every "cannot exceed" rule is checked server-side. The API is the trust
   boundary; a client that skips validation must not be able to overdraw a
   funder.

Current shape of the chain:

    Funding        an award approved for a project
      Disbursement a scheduled instalment released from that award
        Payment    money actually transferred to a payee
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models import Sum


class Funding(models.Model):
    """An award of money to a project, made by a funder."""

    class Status(models.TextChoices):
        """Lifecycle of the award.

        PENDING and APPROVED are decision states; ACTIVE through CLOSED describe
        the disbursement period.
        """

        PENDING = "PENDING"
        APPROVED = "APPROVED"
        ACTIVE = "ACTIVE"
        SUSPENDED = "SUSPENDED"
        COMPLETED = "COMPLETED"
        CANCELLED = "CANCELLED"
        CLOSED = "CLOSED"

    # The project the money is for. PROTECT: an award must never disappear.
    project = models.ForeignKey(
        "projects.Project", on_delete=models.PROTECT, related_name="funding_records"
    )
    # The organisation providing the money.
    provider_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT
    )

    # Inline choices: this enum is referenced in only this module.
    funding_type = models.CharField(
        max_length=15, choices=[("GRANT", "Grant"), ("DONATION", "Donation")]
    )

    # `amount` is what was originally committed; `approved_amount` is what was
    # actually signed off, which may be lower. Disbursements are measured
    # against the approved figure, never the original.
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=18, decimal_places=2)

    currency = models.CharField(max_length=3)
    approval_date = models.DateField(null=True, blank=True)

    # The period during which money may be disbursed.
    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Attaching conditions such as reporting milestones or co-funding
    # requirements. Free text, because conditions are contractual prose.
    conditions = models.TextField(blank=True)

    created_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Enforce the two invariants of an award.

        A funder may approve less than they committed, but never more; and the
        disbursement window must be a real interval.
        """
        if self.approved_amount > self.amount:
            raise ValidationError(
                _("Approved amount cannot exceed requested amount.")
            )
        if self.start_date > self.end_date:
            raise ValidationError(
                _("Funding start date must precede end date.")
            )


class Disbursement(models.Model):
    """One instalment released from a funding award.

    The sum of a funding's disbursements may never exceed its approved amount.
    """

    funding = models.ForeignKey(
        Funding, on_delete=models.PROTECT, related_name="disbursements"
    )

    amount = models.DecimalField(max_digits=18, decimal_places=2)

    # When the instalment is due, and when it actually moved. A populated
    # actual_date with a distant scheduled_date is how delay is spotted.
    scheduled_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("SCHEDULED", "Scheduled"),
            ("PROCESSING", "Processing"),
            ("COMPLETED", "Completed"),
            ("FAILED", "Failed"),
            ("CANCELLED", "Cancelled"),
        ],
        default="SCHEDULED",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Reject a disbursement that would overdraw the award.

        The running total is recomputed from the database rather than trusted
        from a field, so the check reflects committed rows and not stale client
        state. Excluding this row's own primary key makes the rule correct both
        on insert and on edit.
        """
        total = (
            self.funding.disbursements.exclude(pk=self.pk).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        ) + self.amount
        if total > self.funding.approved_amount:
            raise ValidationError(
                _("Disbursements cannot exceed the approved funding.")
            )


class Payment(models.Model):
    """Money transferred against a disbursement, to a person or an organisation.

    The sum of a disbursement's payments may never exceed the disbursement
    amount, which is what stops the same instalment being paid out twice.
    """

    disbursement = models.ForeignKey(
        Disbursement, on_delete=models.PROTECT, related_name="payments"
    )

    # Who releases the money.
    payer_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT
    )

    # Who receives it. Exactly one of these two must be set, enforced in
    # clean(): a payment goes to a human or to a body, never both and never
    # neither.
    payee_person = models.ForeignKey(
        "persons.Person", on_delete=models.PROTECT, null=True, blank=True
    )
    payee_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="received_payments",
    )

    amount = models.DecimalField(max_digits=18, decimal_places=2)
    # Stored per payment rather than inherited, because a disbursement may be
    # settled across currencies in practice.
    currency = models.CharField(max_length=3)

    # NOTE: a plain CharField with no `choices`. The specification defines six
    # methods (BANK_TRANSFER, MOBILE_MONEY, CASH, CARD, CHEQUE, OTHER) but
    # none of them are currently validated.
    payment_method = models.CharField(max_length=20)

    # The bank's or mobile-money operator's reference. UNIQUE, which is also the
    # platform's protection against double processing: the same reference cannot
    # be recorded twice.
    transaction_reference = models.CharField(max_length=255, unique=True)

    payment_date = models.DateField(null=True, blank=True)

    # NOTE: a plain CharField with no `choices`; the specification defines
    # PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED.
    status = models.CharField(max_length=20, default="PENDING")

    created_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Enforce a single payee and prevent overpaying a disbursement.

        Two independent rules, both recomputed from the database:
        exactly one payee, and cumulative payments within the disbursement
        amount. Excluding this row's own key keeps the second rule correct when
        an existing payment is edited.
        """
        if bool(self.payee_person_id) == bool(self.payee_organization_id):
            raise ValidationError(_("Provide exactly one payment payee."))

        total = (
            self.disbursement.payments.exclude(pk=self.pk).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        ) + self.amount
        if total > self.disbursement.amount:
            raise ValidationError(
                _("Payments cannot exceed the disbursement amount.")
            )
