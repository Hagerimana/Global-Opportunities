"""URL routes for the accounts app, mounted at /api/auth/ by config/urls.py."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CurrentAccountView,
    LoginView,
    LogoutView,
    RegisterView,
    RequestPasswordResetView,
    ResendVerificationCodeView,
    ResetPasswordView,
    VerifyEmailView,
)

urlpatterns = [
    # POST /api/auth/register/ -- create a Person + User pair.
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    # POST/api/auth/verify-email: for email verification.
    path(
        "verify-email/",
        VerifyEmailView.as_view(),
        name="verify-email",
    ),
    # POST /api/auth/resend-code
    path(
        "resend-code/",
        ResendVerificationCodeView.as_view(),
        name="resend-code",
    ),
    # POST /api/auth/login/ -- exchange credentials for an access/refresh pair.
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "me/",
        CurrentAccountView.as_view(),
        name="current-account",
    ),
    # POST /api/auth/logout
    path("logout/", LogoutView.as_view(), name="logout"),
    # POST /api/change-password/
    path(
        "password/change/",
        ChangePasswordView.as_view(),
        name="password-change",
    ),
    # Request or resend a password-recovery code.
    path(
        "password/reset/request/",
        RequestPasswordResetView.as_view(),
        name="password-reset-request",
    ),
    # Verify the recovery code and set a new password.
    path(
        "password/reset/confirm/",
        ResetPasswordView.as_view(),
        name="password-reset-confirm",
    ),
    # POST /api/auth/refresh/ -- exchange a valid refresh token for a new
    # access token. Uses SimpleJWT's built-in view.
    path("refresh/", TokenRefreshView.as_view()),
]
