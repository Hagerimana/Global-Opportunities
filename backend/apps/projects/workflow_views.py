"""Ordered project workflow endpoints."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext as _
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import parsers, permissions, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.persons.applicant_views import require_applicant
from .invitation_views import ExpertInvitationListCreateView
from .models import Project, ProjectProposalDocument
from .workflow_serializers import (
    DescriptionFundingSerializer, DomainSerializer, ReviewSerializer, ReviewUpdateSerializer,
    WorkflowStateSerializer,
)
from .workflow_services import (
    create_project_from_pdf, current_proposal, description_and_funding_issues, owned_draft,
    require_step, workflow_state,
)


class WorkflowPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


@api_view(["POST"])
@permission_classes([WorkflowPermission])
@parser_classes([parsers.MultiPartParser, parsers.FormParser])
def upload_project_pdf(request):
    require_applicant(request.user)
    project = create_project_from_pdf(request.user, request.FILES.get("file"))
    return Response(
        WorkflowStateSerializer(workflow_state(project, request.user)).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([WorkflowPermission])
def workflow_detail(request, project_id):
    project = get_object_or_404(Project, pk=project_id, created_by_user=request.user)
    require_applicant(request.user)
    return Response(WorkflowStateSerializer(workflow_state(project, request.user)).data)


@api_view(["PATCH"])
@permission_classes([WorkflowPermission])
def select_domain(request, project_id):
    with transaction.atomic():
        project = owned_draft(request.user, project_id)
        require_step(project, "DOMAIN")
        serializer = DomainSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
    return Response(WorkflowStateSerializer(workflow_state(project, request.user)).data)


@api_view(["PATCH"])
@permission_classes([WorkflowPermission])
def save_description_funding(request, project_id):
    with transaction.atomic():
        project = owned_draft(request.user, project_id)
        require_step(project, "DESCRIPTION_AND_FUNDING")
        serializer = DescriptionFundingSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        project.full_clean()
        project.save()
    return Response(WorkflowStateSerializer(workflow_state(project, request.user)).data)


@api_view(["GET", "PATCH"])
@permission_classes([WorkflowPermission])
def review_project(request, project_id):
    require_applicant(request.user)

    if request.method == "GET":
        project = get_object_or_404(
            Project.objects.select_related("created_by_user"),
            pk=project_id,
            created_by_user=request.user,
        )
        require_step(project, "REVIEW_AND_POST")

        return Response(
            ReviewSerializer(
                project,
                context={"request": request},
            ).data
        )

    with transaction.atomic():
        project = owned_draft(request.user, project_id)
        require_step(project, "REVIEW_AND_POST")

        serializer = ReviewUpdateSerializer(
            project,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        # Apply validated values in memory before validating the whole project.
        for field, value in serializer.validated_data.items():
            setattr(project, field, value)

        issues = description_and_funding_issues(project)

        if not project.domain:
            issues["domain"] = _("Select a project domain.")

        if issues:
            raise ValidationError(issues)

        try:
            project.full_clean()
        except DjangoValidationError as exc:
            detail = (
                exc.message_dict
                if hasattr(exc, "message_dict")
                else {"non_field_errors": exc.messages}
            )
            raise ValidationError(detail) from exc

        # Support the field if it was added using the earlier instructions.
        # Editing must not preserve a previous verification confirmation.
        if hasattr(project, "verified_at"):
            project.verified_at = None

        project.save()

        result = ReviewSerializer(
            project,
            context={"request": request},
        ).data

    return Response(result)


@api_view(["POST"])
@permission_classes([WorkflowPermission])
def post_project(request, project_id):
    from .workflow_services import post_project as post
    with transaction.atomic():
        project = post(request.user, project_id)
    return Response(
        WorkflowStateSerializer(workflow_state(project, request.user)).data,
        status=status.HTTP_201_CREATED,
    )
