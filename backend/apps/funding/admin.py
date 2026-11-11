"""Django admin screens for funding awards and financial records."""

from decimal import Decimal

from django import forms
from django.contrib import admin
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from apps.funding.models import Funding, Disbursement, Payment
from apps.organizations.models import Organization
from apps.projects.models import Project


class ProjectChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return (
            f"Project ID {obj.pk} — "
            f"{obj.title or obj.reference_number} — "
            f"{obj.reference_number}"
        )


class OrganizationChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return f"Organization ID {obj.pk} — {obj.name}"


class FundingAdminForm(forms.ModelForm):
    project = ProjectChoiceField(
        queryset=Project.objects.none(),
    )

    provider_organization = OrganizationChoiceField(
        queryset=Organization.objects.none(),
    )

    class Meta:
        model = Funding
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if "project" in self.fields:
            self.fields["project"].queryset = (
                Project.objects.filter(
                    posted_at__isnull=False,
                )
                .exclude(
                    status__in=[
                        Project.Status.DRAFT,
                        Project.Status.CANCELLED,
                        Project.Status.SUSPENDED,
                    ]
                )
                .order_by("-posted_at", "-pk")
            )

        if "provider_organization" in self.fields:
            self.fields["provider_organization"].queryset = Organization.objects.filter(
                verification_status=(Organization.Verification.VERIFIED),
            ).order_by("name")

        if "status" in self.fields:
            self.fields["status"].choices = [
                (Funding.Status.PENDING, "Pending"),
                (Funding.Status.APPROVED, "Approved"),
            ]

    def clean_currency(self):
        value = self.cleaned_data["currency"].strip().upper()

        if len(value) != 3 or not value.isascii() or not value.isalpha():
            raise forms.ValidationError("Enter a three-letter currency code.")

        return value

    def clean(self):
        cleaned = super().clean()

        amount = cleaned.get("amount")
        approved = cleaned.get("approved_amount")
        award_status = cleaned.get("status")
        approval_date = cleaned.get("approval_date")

        if amount is not None and amount <= Decimal("0"):
            self.add_error(
                "amount",
                "The award amount must be greater than zero.",
            )

        if approved is not None and approved < Decimal("0"):
            self.add_error(
                "approved_amount",
                "The approved amount cannot be negative.",
            )

        if amount is not None and approved is not None and approved > amount:
            self.add_error(
                "approved_amount",
                "Approved amount cannot exceed the award amount.",
            )

        if award_status == Funding.Status.APPROVED:
            if approved is not None and approved <= Decimal("0"):
                self.add_error(
                    "approved_amount",
                    "An approved award must have a positive amount.",
                )

            if approval_date is None:
                self.add_error(
                    "approval_date",
                    "Enter the actual approval date.",
                )
            elif approval_date > timezone.localdate():
                self.add_error(
                    "approval_date",
                    "Approval date cannot be in the future.",
                )

        start = cleaned.get("start_date")
        end = cleaned.get("end_date")

        if start is not None and end is not None and start > end:
            self.add_error(
                "end_date",
                "End date must be on or after the start date.",
            )

        return cleaned

    def _post_clean(self):
        # Funding.clean() assumes these values are present.
        # Missing/invalid required fields already have form errors.
        required_values = (
            "amount",
            "approved_amount",
            "start_date",
            "end_date",
        )

        if any(self.cleaned_data.get(field) is None for field in required_values):
            return

        super()._post_clean()


class FundingAdmin(admin.ModelAdmin):
    form = FundingAdminForm

    list_display = (
        "id",
        "project_number",
        "project_title",
        "provider_organization",
        "approved_amount",
        "currency",
        "status",
        "approval_date",
    )

    list_display_links = (
        "id",
        "project_title",
    )

    search_fields = (
        "project__title",
        "project__reference_number",
        "provider_organization__name",
    )

    list_filter = (
        "status",
        "funding_type",
        "currency",
    )

    readonly_fields = (
        "created_by_user",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "project",
        "provider_organization",
    )

    ordering = ("-created_at", "-id")
    list_per_page = 30

    @admin.display(
        description="Project ID",
        ordering="project_id",
    )
    def project_number(self, obj):
        return obj.project_id

    @admin.display(
        description="Project",
        ordering="project__title",
    )
    def project_title(self, obj):
        return obj.project.title or obj.project.reference_number

    def has_change_permission(self, request, obj=None):
        if obj is not None:
            if obj.status != Funding.Status.PENDING:
                return False

            if obj.disbursements.exists():
                return False

        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        if change:
            previous = Funding.objects.select_for_update().get(pk=obj.pk)

            if (
                previous.status != Funding.Status.PENDING
                or previous.disbursements.exists()
            ):
                raise PermissionDenied(
                    "This award can no longer be edited through "
                    "the pending-award approval screen."
                )

            obj.created_by_user = previous.created_by_user
        else:
            obj.created_by_user = request.user

        obj.full_clean()

        super().save_model(request, obj, form, change)


class ReadOnlyFinancialAdmin(admin.ModelAdmin):
    """Display financial records without creating money movements."""

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class DisbursementAdmin(ReadOnlyFinancialAdmin):
    list_display = (
        "id",
        "funding",
        "amount",
        "scheduled_date",
        "actual_date",
        "status",
    )

    list_filter = ("status",)

    search_fields = (
        "funding__project__title",
        "funding__project__reference_number",
    )

    list_select_related = ("funding",)
    ordering = ("-created_at", "-id")


class PaymentAdmin(ReadOnlyFinancialAdmin):
    list_display = (
        "id",
        "transaction_reference",
        "disbursement",
        "amount",
        "currency",
        "status",
        "payment_date",
    )

    list_filter = (
        "status",
        "currency",
        "payment_method",
    )

    search_fields = (
        "transaction_reference",
        "disbursement__funding__project__title",
        "disbursement__funding__project__reference_number",
    )

    list_select_related = ("disbursement",)
    ordering = ("-created_at", "-id")


# These registrations make the models available in Django admin.
# Preserve an existing registration if another module supplied one.
if not admin.site.is_registered(Funding):
    admin.site.register(Funding, FundingAdmin)

if not admin.site.is_registered(Disbursement):
    admin.site.register(Disbursement, DisbursementAdmin)

if not admin.site.is_registered(Payment):
    admin.site.register(Payment, PaymentAdmin)
