"""Helpers for registration verification emails and codes."""

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.utils import timezone
from django.db import transaction
from django.utils.crypto import salted_hmac
from django.utils.translation import gettext as _

from .models import PasswordResetRequest, User

VERIFICATION_CODE_LIFETIME = timedelta(minutes=3)


def generate_verification_code():
    """Return a cryptographically secure four-digit code."""

    return f"{secrets.randbelow(10_000):04d}"


def create_verification_code(pending_registration):
    """
    Generate, hash, store, and email a new verification code.
    """

    code = generate_verification_code()

    pending_registration.code_hash = make_password(code)
    pending_registration.code_expires_at = timezone.now() + VERIFICATION_CODE_LIFETIME
    pending_registration.failed_attempts = 0

    # Save the complete existing model instance.
    pending_registration.save()

    send_verification_email(
        recipient_email=pending_registration.email,
        code=code,
    )

    return code


def send_verification_email(recipient_email, code):
    """Send the verification code from the configured system mailbox."""

    send_mail(
        subject=_("Verify your Global Opportunities account"),
        message=_(
            "Hello,\n\n"
            "Your Global Opportunities verification code is: {code}\n\n"
            "This code expires in 3 minutes and can be used only once.\n"
            "If you did not request this registration, you can ignore this "
            "email.\n\n"
            "Global Opportunities"
        ).format(code=code),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=False,
    )


PASSWORD_RESET_CODE_LIFETIME = timedelta(minutes=10)
PASSWORD_RESET_RESEND_COOLDOWN = timedelta(seconds=60)
PASSWORD_RESET_MAX_ATTEMPTS = 5


class PasswordResetCooldownError(Exception):
    """A recovery email was requested before the cooldown elapsed."""

    def __init__(self, retry_after):
        self.retry_after = retry_after
        super().__init__(
            _(
                "Please wait {seconds} seconds before requesting another code."
            ).format(seconds=retry_after)
        )


def password_reset_fingerprint(user):
    """Bind a recovery challenge to the user's current password hash."""

    return salted_hmac(
        key_salt="accounts.password_reset.password_state",
        value=user.password,
        algorithm="sha256",
    ).hexdigest()


def generate_password_reset_code():
    """Return a cryptographically generated six-digit code."""

    return f"{secrets.randbelow(1_000_000):06d}"


def send_password_reset_email(recipient_email, code):
    """Email a recovery code without including the user's password."""

    send_mail(
        subject=_("Reset your Global Opportunities password"),
        message=_(
            "Hello,\n\n"
            "Your password reset code is: {code}\n\n"
            "This code expires in 10 minutes and can be used only once.\n"
            "If you request another code, use the latest email.\n\n"
            "If you did not request this password reset, "
            "you can ignore this email. Your password has not changed.\n\n"
            "Never share this code with anyone.\n\n"
            "Global Opportunities"
        ).format(code=code),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=False,
    )


def create_password_reset_code(user):
    """
    Create or replace a recovery challenge and email its code.

    Lock the user row so requests for the same account cannot bypass
    the resend cooldown by creating challenges concurrently.
    """

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)

        reset_request = PasswordResetRequest.objects.filter(
            user=locked_user,
        ).first()

        now = timezone.now()

        if reset_request is not None:
            next_send_at = reset_request.last_sent_at + PASSWORD_RESET_RESEND_COOLDOWN

            if now < next_send_at:
                seconds_remaining = (next_send_at - now).total_seconds()

                retry_after = max(
                    1,
                    int(seconds_remaining) + 1,
                )

                raise PasswordResetCooldownError(retry_after)

        code = generate_password_reset_code()

        reset_request, _created = PasswordResetRequest.objects.update_or_create(
            user=locked_user,
            defaults={
                "code_hash": make_password(code),
                "code_expires_at": now + PASSWORD_RESET_CODE_LIFETIME,
                "failed_attempts": 0,
                "last_sent_at": now,
                "password_fingerprint": password_reset_fingerprint(locked_user),
            },
        )

        send_password_reset_email(
            recipient_email=locked_user.email,
            code=code,
        )

    return reset_request
