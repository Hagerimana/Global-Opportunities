"""Authentication endpoints.

Supports personal and organization registration, email verification,
login, logout, password changes, and password recovery.
"""

import logging
from smtplib import SMTPException

from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.utils.translation import gettext as _, gettext_lazy

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ChangePasswordSerializer,
    LogoutSerializer,
    RegisterSerializer,
    RequestPasswordResetSerializer,
    ResendVerificationCodeSerializer,
    ResetPasswordSerializer,
    VerifyEmailSerializer,
)
from .throttles import AuthRateThrottle

logger = logging.getLogger(__name__)


class LoginSerializer(TokenObtainPairSerializer):
    """Use a neutral error message for unsuccessful login attempts."""

    default_error_messages = {
        "no_active_account": gettext_lazy(
            "Unable to log in with those credentials."
        )
    }


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ -> { access, refresh }.

    Uses the configured authentication backend and SimpleJWT rules.
    """

    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]


class RegisterView(APIView):
    """Start a personal or organization registration."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        """Validate signup details and create a pending registration."""

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            pending = serializer.save()

        except IntegrityError:
            return Response(
                {
                    "email": [
                        _(
                            "A conflicting registration already exists. "
                            "Please try again."
                        )
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except (SMTPException, OSError):
            logger.exception("Registration verification email could not be sent.")

            return Response(
                {
                    "detail": (
                        _(
                            "We could not send the verification email right now. "
                            "Please try registering again later."
                        )
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "pending_id": pending.id,
                "email": pending.email,
                "account_type": pending.account_type,
                "message": (
                    _(
                        "Registration started. "
                        "A verification code has been sent to your email."
                    )
                ),
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(transaction.non_atomic_requests, name="dispatch")
class VerifyEmailView(APIView):
    """Verify the login email and create the account and its profile."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        """Verify the code through the account verification serializer."""

        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            {
                "message": _(
                    "Email verified successfully. You can now log in."
                ),
                "email": user.email,
                "account_type": user.account_type,
            },
            status=status.HTTP_201_CREATED,
        )


class ResendVerificationCodeView(APIView):
    """Send a replacement registration verification code."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        """Find the pending registration and send a new code."""

        serializer = ResendVerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            pending = serializer.save()

        except (SMTPException, OSError):
            logger.exception("Replacement verification email could not be sent.")

            return Response(
                {
                    "detail": (
                        _(
                            "We could not send the verification email right now. "
                            "Please try again later."
                        )
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message": _(
                    "A new verification code has been sent to your email."
                ),
                "pending_id": pending.id,
                "email": pending.email,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """Blacklist the authenticated account's refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": _("Logged out successfully.")},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """Change the authenticated account's password."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": _("Password changed successfully.")},
            status=status.HTTP_200_OK,
        )


@method_decorator(transaction.non_atomic_requests, name="dispatch")
class RequestPasswordResetView(APIView):
    """Email a password-recovery code."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RequestPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_request = serializer.save()

        except (SMTPException, OSError):
            logger.exception("Password recovery email could not be sent.")

            return Response(
                {
                    "detail": (
                        _(
                            "We could not send the recovery email right now. "
                            "Please try again later."
                        )
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message": (
                    _(
                        "A six-digit recovery code has been sent "
                        "to your email address."
                    )
                ),
                "email": reset_request.user.email,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(transaction.non_atomic_requests, name="dispatch")
class ResetPasswordView(APIView):
    """Verify a recovery code and replace the account's password."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            {
                "message": (
                    _(
                        "Your password has been reset successfully. "
                        "You can now log in with your new password."
                    )
                ),
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )


class CurrentAccountView(APIView):
    """Return the authenticated account's identity and profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import AccountType

        user = request.user

        if user.account_type == AccountType.PERSONAL:
            if user.person_id is None:
                return Response(
                    {
                        "detail": (
                            _(
                                "This personal account has no linked "
                                "person profile. Please contact support."
                            )
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            person = user.person

            return Response(
                {
                    "id": user.pk,
                    "account_type": AccountType.PERSONAL,
                    "email": user.email,
                    "person": {
                        "first_name": person.first_name,
                        "last_name": person.last_name,
                    },
                    "organization": None,
                }
            )

        if user.account_type == AccountType.ORGANIZATION:
            # The existing owner ForeignKey permits several organizations.
            # Do not silently display an arbitrary organization.
            organizations = list(user.owned_organizations.order_by("pk")[:2])

            if len(organizations) != 1:
                return Response(
                    {
                        "detail": (
                            _(
                                "This account must have exactly one organization "
                                "to use this account page. Please contact support."
                            )
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            organization = organizations[0]

            return Response(
                {
                    "id": user.pk,
                    "account_type": AccountType.ORGANIZATION,
                    "email": user.email,
                    "person": None,
                    "organization": {
                        "id": organization.pk,
                        "name": organization.name,
                        "organization_type": (organization.organization_type),
                        "registration_number": (organization.registration_number),
                        "email": organization.email,
                        "phone": organization.phone,
                        "address": organization.address,
                        "province": organization.province,
                        "commune": organization.commune,
                        "verification_status": (organization.verification_status),
                    },
                }
            )

        return Response(
            {"detail": _("This account has an unsupported account type.")},
            status=status.HTTP_409_CONFLICT,
        )
