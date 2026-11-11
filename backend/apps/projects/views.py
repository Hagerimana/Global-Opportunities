"""Private project-draft endpoints."""

from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """Creator-scoped project access.

    Public descriptions and controlled posting will use separate
    endpoints.
    """

    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    filterset_fields = ["status", "sector", "project_type"]
    search_fields = ["title", "description", "location"]

    def get_queryset(self):
        return Project.objects.filter(created_by_user=self.request.user).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        user = self.request.user

        if (
            user.account_type != "PERSONAL"
            or user.person_id is None
            or not user.is_active
            or user.status != "ACTIVE"
            or user.email_verified_at is None
        ):
            raise ValidationError(
                {
                    "account": (
                        _(
                            "Creating a project requires an active, "
                            "email-verified personal account."
                        )
                    )
                }
            )

        serializer.save(
            created_by_user=user,
            status=Project.Status.DRAFT,
        )

    def perform_update(self, serializer):
        if serializer.instance.status != Project.Status.DRAFT:
            raise ValidationError(
                {"status": _("Only drafts can be changed through this endpoint.")}
            )

        instance = serializer.save()

        # Any change to a verified draft requires verification again.
        if instance.verified_at is not None:
            instance.verified_at = None
            instance.save(update_fields=["verified_at", "updated_at"])

    def perform_destroy(self, instance):
        if instance.status != Project.Status.DRAFT:
            raise ValidationError(
                {"status": _("Only drafts can be deleted through this endpoint.")}
            )

        instance.delete()

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        project = self.get_object()

        if project.status != Project.Status.DRAFT:
            raise ValidationError(
                {"status": _("Only draft projects can be verified.")}
            )

        if not project.title.strip():
            raise ValidationError(
                {"title": _("Enter a project title before verification.")}
            )

        if not project.description.strip():
            raise ValidationError(
                {
                    "description": _(
                        "Enter a project description before verification."
                    )
                }
            )

        project.verified_at = timezone.now()
        project.save(update_fields=["verified_at", "updated_at"])

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="unverify")
    def unverify(self, request, pk=None):
        project = self.get_object()

        if project.status != Project.Status.DRAFT:
            raise ValidationError(
                {
                    "status": _(
                        "Only draft projects can be returned to verification."
                    )
                }
            )

        project.verified_at = None
        project.save(update_fields=["verified_at", "updated_at"])

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(
            request, response, *args, **kwargs
        )
        response["Cache-Control"] = "private, no-store"
        response["Pragma"] = "no-cache"
        return response
