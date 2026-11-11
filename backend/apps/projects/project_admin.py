"""Project administration with visible numeric database IDs."""

from django.contrib import admin
from django.db.models import Exists, OuterRef

from apps.funding.models import Funding

from .models import Project
from .public_queries import COMMITTED_FUNDING_STATES


class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reference_number",
        "title",
        "status",
        "approved_funding",
        "progress_percentage",
        "posted_at",
        "completed_at",
    )

    list_display_links = (
        "id",
        "reference_number",
        "title",
    )

    search_fields = (
        "reference_number",
        "title",
        "created_by_user__email",
    )

    list_filter = (
        "status",
        "domain",
        "currency",
    )

    ordering = (
        "-created_at",
        "-id",
    )

    list_per_page = 30

    list_select_related = ("created_by_user",)

    date_hierarchy = "created_at"

    empty_value_display = "—"

    def get_queryset(self, request):
        queryset = super().get_queryset(request)

        approved_awards = Funding.objects.filter(
            project_id=OuterRef("pk"),
            status__in=COMMITTED_FUNDING_STATES,
            approved_amount__gt=0,
        )

        return queryset.annotate(
            admin_has_approved_funding=Exists(approved_awards),
        )

    @admin.display(
        description="Approved funding",
        boolean=True,
        ordering="admin_has_approved_funding",
    )
    def approved_funding(self, obj):
        return obj.admin_has_approved_funding

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)

    def has_add_permission(self, request):
        # Projects must start through the PDF-first posting workflow.
        return False

    def has_change_permission(self, request, obj=None):
        # This screen is for inspecting projects, not bypassing
        # the controlled posting and progress services.
        return False

    def has_delete_permission(self, request, obj=None):
        # Preserve proposal, funding and invitation relationships.
        return False


if admin.site.is_registered(Project):
    # Preserve an existing registration and its permission policy.
    # Add the identifiers without unregistering other admin code.
    existing_admin = admin.site.get_model_admin(Project)

    existing_admin.list_display = tuple(
        dict.fromkeys(
            (
                "id",
                "reference_number",
                *existing_admin.list_display,
            )
        )
    )

    existing_admin.list_display_links = tuple(
        dict.fromkeys(
            (
                "id",
                "reference_number",
                *(existing_admin.list_display_links or ()),
            )
        )
    )
else:
    admin.site.register(Project, ProjectAdmin)
