"""Authenticated endpoints for professional-profile drafts."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _

from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ProfileDocumentRequirement,
    ProfileType,
    ProfessionalDomain,
    ProfessionalProfileRequest,
)
from .serializers import (
    ProfileDraftCreateSerializer,
    ProfileDraftFieldsSerializer,
    ProfileRequestSerializer,
)
from .services import (
    create_profile_request,
    update_profile_request,
)


class EligiblePersonalAccount(permissions.BasePermission):
    message = _(
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


def raise_api_validation_error(error):
    if hasattr(error, "message_dict"):
        detail = error.message_dict
    else:
        detail = {"non_field_errors": error.messages}

    raise ValidationError(detail)


def owned_requests(user):
    return (
        ProfessionalProfileRequest.objects.filter(user=user)
        .prefetch_related("document_requirements")
        .order_by("-created_at", "-pk")
    )


class ProfileOptionsView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        EligiblePersonalAccount,
    ]

    def get(self, request):
        requirements = (
            ProfileDocumentRequirement.objects.filter(is_active=True)
            .select_related("document_type")
            .order_by("profile_type", "display_order", "pk")
        )

        return Response(
            {
                "profile_types": [
                    {"value": value, "label": label}
                    for value, label in ProfileType.choices
                ],
                "domains": [
                    {"value": value, "label": label}
                    for value, label in ProfessionalDomain.choices
                ],
                "requirements": [
                    {
                        "id": item.pk,
                        "profile_type": item.profile_type,
                        "name": item.name,
                        "description": item.description,
                        "is_mandatory": item.is_mandatory,
                        "is_conditional": item.is_conditional,
                        "condition_rule": item.condition_rule,
                        "accepted_file_types": item.accepted_file_types,
                        "max_file_size": item.max_file_size,
                        "validity_required": item.validity_required,
                    }
                    for item in requirements
                ],
            }
        )


class ProfileRequestListCreateView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        EligiblePersonalAccount,
    ]

    def get(self, request):
        # Return the 50 most recent applications for this account only.
        applications = owned_requests(request.user)[:50]

        return Response(
            ProfileRequestSerializer(
                applications,
                many=True,
            ).data
        )

    def post(self, request):
        serializer = ProfileDraftCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            application = create_profile_request(
                user=request.user,
                **serializer.validated_data,
            )
        except DjangoValidationError as error:
            raise_api_validation_error(error)

        return Response(
            ProfileRequestSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class ProfileRequestDetailView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        EligiblePersonalAccount,
    ]

    def get(self, request, pk):
        application = get_object_or_404(
            owned_requests(request.user),
            pk=pk,
        )

        return Response(ProfileRequestSerializer(application).data)

    def patch(self, request, pk):
        serializer = ProfileDraftFieldsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            application = update_profile_request(
                user=request.user,
                request_id=pk,
                changes=serializer.validated_data,
            )
        except ProfessionalProfileRequest.DoesNotExist:
            get_object_or_404(
                ProfessionalProfileRequest.objects.none(),
                pk=pk,
            )
        except DjangoValidationError as error:
            raise_api_validation_error(error)

        return Response(ProfileRequestSerializer(application).data)


class DevelopmentProfileApprovalView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        EligiblePersonalAccount,
    ]

    def post(self, request, pk):
        from rest_framework.exceptions import NotFound

        from .development import approve_development_profile
        from .services import development_approval_enabled

        if not development_approval_enabled():
            raise NotFound()

        get_object_or_404(
            ProfessionalProfileRequest.objects.filter(
                user=request.user,
            ),
            pk=pk,
        )

        try:
            application = approve_development_profile(
                user=request.user,
                request_id=pk,
            )
        except DjangoValidationError as error:
            raise_api_validation_error(error)

        return Response(ProfileRequestSerializer(application).data)
