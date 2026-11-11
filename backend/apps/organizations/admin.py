"""Organization verification management in Django admin."""

from django.contrib import admin, messages
from django.db import transaction

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "organization_type",
        "registration_number",
        "owner",
        "verification_status",
        "created_at",
    )

    list_display_links = (
        "id",
        "name",
    )

    # Edit existing organizations directly from the list.
    list_editable = ("verification_status",)

    list_filter = (
        "verification_status",
        "organization_type",
    )

    search_fields = (
        "name",
        "registration_number",
        "email",
        "owner__email",
    )

    list_select_related = ("owner",)
    raw_id_fields = ("owner",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)
    list_per_page = 50

    actions = ("verify_selected_organizations",)

    fieldsets = (
        (
            "Organization",
            {
                "fields": (
                    "name",
                    "organization_type",
                    "registration_number",
                    "description",
                    "owner",
                ),
            },
        ),
        (
            "Verification",
            {
                "fields": ("verification_status",),
            },
        ),
        (
            "Contact",
            {
                "fields": (
                    "email",
                    "phone",
                    "website",
                ),
            },
        ),
        (
            "Address",
            {
                "fields": (
                    "address",
                    "province",
                    "commune",
                ),
            },
        ),
        (
            "Record information",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    @admin.action(
        description="Approve selected organizations — mark as VERIFIED",
        permissions=["change"],
    )
    def verify_selected_organizations(self, request, queryset):
        approved = 0

        with transaction.atomic():
            organizations = queryset.select_for_update().order_by("pk")

            for organization in organizations:
                if (
                    organization.verification_status
                    == Organization.Verification.VERIFIED
                ):
                    continue

                previous_status = organization.verification_status

                organization.verification_status = Organization.Verification.VERIFIED

                organization.save(
                    update_fields=(
                        "verification_status",
                        "updated_at",
                    )
                )

                self.log_change(
                    request,
                    organization,
                    (
                        "Organization verification changed "
                        f"from {previous_status} to VERIFIED "
                        "through the approval action."
                    ),
                )

                approved += 1

        self.message_user(
            request,
            (
                f"{approved} organization(s) marked VERIFIED. "
                "Organizations already verified were unchanged."
            ),
            level=messages.SUCCESS,
        )
