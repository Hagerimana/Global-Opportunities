"""Admin configuration for professional profiles.

Requirement configuration is editable by appropriately permitted staff.

Operational records are read-only here until workflow services provide
controlled submission, review, and approval operations.
"""

from django.contrib import admin

from .models import (
    ProfileDocumentRequirement,
    ProfileDocumentType,
    ProfessionalProfile,
    ProfessionalProfileDocument,
    ProfessionalProfileDocumentReview,
    ProfessionalProfileRequest,
    ProfessionalProfileRequestEvent,
    ProfessionalProfileRequestRequirement,
)


class NoDeleteConfigurationAdmin(admin.ModelAdmin):
    """Deactivate configuration instead of deleting referenced records."""

    actions = None

    def has_delete_permission(self, request, obj=None):
        return False


class ReadOnlyWorkflowAdmin(admin.ModelAdmin):
    """Prevent direct edits that bypass approval and audit services."""

    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)


@admin.register(ProfileDocumentType)
class ProfileDocumentTypeAdmin(NoDeleteConfigurationAdmin):
    list_display = (
        "code",
        "name",
        "is_active",
        "updated_at",
    )

    list_filter = ("is_active",)
    search_fields = ("code", "name")
    readonly_fields = ("created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))

        if obj is not None:
            fields.append("code")

        return fields


@admin.register(ProfileDocumentRequirement)
class ProfileDocumentRequirementAdmin(NoDeleteConfigurationAdmin):
    list_display = (
        "name",
        "profile_type",
        "document_type",
        "is_mandatory",
        "is_conditional",
        "is_active",
        "display_order",
    )

    list_filter = (
        "profile_type",
        "is_mandatory",
        "is_conditional",
        "is_active",
    )

    search_fields = (
        "code",
        "name",
        "description",
        "document_type__name",
    )

    list_select_related = ("document_type",)

    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (
            "Requirement",
            {
                "fields": (
                    "profile_type",
                    "code",
                    "document_type",
                    "name",
                    "description",
                    "display_order",
                    "is_active",
                )
            },
        ),
        (
            "Applicability",
            {
                "fields": (
                    "is_mandatory",
                    "is_conditional",
                    "condition_rule",
                    "allow_not_applicable",
                )
            },
        ),
        (
            "File and validity rules",
            {
                "fields": (
                    "accepted_file_types",
                    "max_file_size",
                    "validity_required",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))

        if obj is not None:
            fields.extend(("profile_type", "code"))

        return fields


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "user",
        "profile_type",
        "domain",
        "verification_status",
        "is_active",
    )

    list_filter = (
        "profile_type",
        "verification_status",
        "is_active",
    )

    search_fields = ("user__email",)
    list_select_related = ("user",)


@admin.register(ProfessionalProfileRequest)
class ProfessionalProfileRequestAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "user",
        "request_type",
        "requested_role",
        "status",
        "development_auto_approved",
        "created_at",
    )

    list_filter = (
        "request_type",
        "requested_role",
        "status",
        "development_auto_approved",
    )

    search_fields = ("user__email",)
    list_select_related = ("user", "reviewer_user")


@admin.register(ProfessionalProfileRequestEvent)
class ProfessionalProfileRequestEventAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "profile_request",
        "event_type",
        "actor_user",
        "created_at",
    )

    list_filter = ("event_type",)
    list_select_related = ("profile_request", "actor_user")


@admin.register(ProfessionalProfileRequestRequirement)
class ProfessionalProfileRequestRequirementAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "profile_request",
        "requirement",
        "applicability",
        "assessed_at",
    )

    list_filter = ("applicability",)

    list_select_related = (
        "profile_request",
        "requirement",
        "assessed_by_user",
    )


@admin.register(ProfessionalProfileDocument)
class ProfessionalProfileDocumentAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "request_requirement",
        "original_filename",
        "verification_status",
        "is_current",
        "created_at",
    )

    list_filter = (
        "verification_status",
        "is_current",
    )

    search_fields = ("original_filename",)

    list_select_related = (
        "request_requirement",
        "reviewer_user",
    )

    # Display the document ID, not a link to the shared document admin.
    # Private downloads will use a separately authorized endpoint.
    exclude = ("document",)

    readonly_fields = ("stored_document_id",)

    @admin.display(description="Stored document ID")
    def stored_document_id(self, obj):
        return obj.document_id


@admin.register(ProfessionalProfileDocumentReview)
class ProfessionalProfileDocumentReviewAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "id",
        "profile_document",
        "decision",
        "reviewer_user",
        "development_auto_verified",
        "reviewed_at",
    )

    list_filter = (
        "decision",
        "development_auto_verified",
    )

    list_select_related = (
        "profile_document",
        "reviewer_user",
    )
