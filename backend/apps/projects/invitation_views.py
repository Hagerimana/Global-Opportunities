"""Authenticated Expert directory and project invitation endpoints."""

from django.core.exceptions import (
    ObjectDoesNotExist,
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _, gettext_lazy

from rest_framework import generics, permissions, status
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professional_profiles.models import ProfessionalProfile

from .invitation_serializers import (
    CreateExpertInvitationSerializer,
    EmptyInvitationActionSerializer,
    ExpertDirectorySerializer,
    ExpertInvitationSerializer,
    RespondToExpertInvitationSerializer,
)
from .invitation_services import (
    cancel_expert_invitation,
    create_expert_invitation,
    respond_to_expert_invitation,
)
from .models import Project, ProjectExpertInvitation


class ActivePersonalAccount(permissions.BasePermission):
    message = gettext_lazy(
        "An active, email-verified personal account "
        "with a person profile is required."
    )

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.account_type == "PERSONAL"
            and user.person_id is not None
            and user.is_active
            and user.status == "ACTIVE"
            and user.email_verified_at is not None
        )


def invitation_queryset(user):
    """Return only invitations this account sent or received."""

    return (
        ProjectExpertInvitation.objects.filter(
            Q(invited_by_user=user) | Q(expert_user=user)
        )
        .select_related(
            "project",
            "expert_user__person",
            "invited_by_user__person",
        )
        .order_by("-created_at", "-pk")
    )


def call_invitation_service(service, **kwargs):
    """Translate service errors into API responses.

    IntegrityError is caught after the service's atomic block exits.
    """

    try:
        return service(**kwargs)

    except ObjectDoesNotExist as exc:
        raise NotFound(
            _("The requested project, account, or invitation was not found.")
        ) from exc

    except DjangoPermissionDenied as exc:
        raise PermissionDenied(str(exc)) from exc

    except DjangoValidationError as exc:
        detail = (
            exc.message_dict
            if hasattr(exc, "message_dict")
            else {"non_field_errors": exc.messages}
        )

        raise ValidationError(detail) from exc

    except IntegrityError as exc:
        raise ValidationError(
            {
                "invitation": (
                    _(
                        "The invitation could not be saved because "
                        "of a conflicting record. Refresh and try again."
                    )
                )
            }
        ) from exc


class ExpertDirectoryView(generics.ListAPIView):
    """List eligible Experts for the project's invitation step."""

    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = ExpertDirectorySerializer

    def get_queryset(self):
        queryset = (
            ProfessionalProfile.objects.filter(
                profile_type="EXPERT",
                verification_status="VERIFIED",
                is_active=True,
                user__account_type="PERSONAL",
                user__person__isnull=False,
                user__is_active=True,
                user__status="ACTIVE",
                user__email_verified_at__isnull=False,
            )
            .exclude(user=self.request.user)
            .select_related("user__person")
            .order_by(
                "user__person__first_name",
                "user__person__last_name",
                "pk",
            )
        )

        domain = self.request.query_params.get("domain")

        if domain:
            queryset = queryset.filter(domain=domain)

        return queryset


class ExpertInvitationListCreateView(generics.ListCreateAPIView):
    """List owned invitations or record a new project invitation."""

    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = ExpertInvitationSerializer

    def get_queryset(self):
        return invitation_queryset(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = CreateExpertInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Avoid exposing another applicant's project through this endpoint.
        get_object_or_404(
            Project.objects.filter(
                created_by_user=request.user,
            ),
            pk=serializer.validated_data["project_id"],
        )

        invitation = call_invitation_service(
            create_expert_invitation,
            user=request.user,
            **serializer.validated_data,
        )

        return Response(
            ExpertInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class ExpertInvitationDetailView(generics.RetrieveAPIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = ExpertInvitationSerializer

    def get_queryset(self):
        return invitation_queryset(self.request.user)


class RespondToExpertInvitationView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    def post(self, request, pk):
        # Only the recipient can access this response operation.
        get_object_or_404(
            ProjectExpertInvitation.objects.filter(
                expert_user=request.user,
            ),
            pk=pk,
        )

        serializer = RespondToExpertInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = call_invitation_service(
            respond_to_expert_invitation,
            user=request.user,
            invitation_id=pk,
            accept=serializer.validated_data["accept"],
        )

        return Response(ExpertInvitationSerializer(invitation).data)


class CancelExpertInvitationView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    def post(self, request, pk):
        # Only the applicant who sent it can access cancellation.
        get_object_or_404(
            ProjectExpertInvitation.objects.filter(
                invited_by_user=request.user,
            ),
            pk=pk,
        )

        serializer = EmptyInvitationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = call_invitation_service(
            cancel_expert_invitation,
            user=request.user,
            invitation_id=pk,
        )

        return Response(ExpertInvitationSerializer(invitation).data)
