"""Registration payload validation and pending-account creation."""

import re

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.crypto import constant_time_compare
from django.utils.translation import gettext as _

from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
import unicodedata

from apps.persons.models import Person
from apps.organizations.serializers import OrganizationRegistrationSerializer
from apps.organizations.models import Organization

from .models import (
    AccountType,
    PasswordResetRequest,
    PendingRegistration,
    User,
)
from .utils import (
    PASSWORD_RESET_MAX_ATTEMPTS,
    PasswordResetCooldownError,
    create_password_reset_code,
    create_verification_code,
    password_reset_fingerprint,
)


class RegisterSerializer(serializers.Serializer):
    """Validate registration data and store it temporarily."""

    email = serializers.EmailField(max_length=254)

    account_type = serializers.ChoiceField(
        choices=AccountType.choices,
        default=AccountType.PERSONAL,
    )

    organization = OrganizationRegistrationSerializer(
        required=False,
    )

    password = serializers.CharField(
        write_only=True,
        min_length=12,
        max_length=128,
        trim_whitespace=False,
    )

    password_confirmation = serializers.CharField(
        write_only=True,
        max_length=128,
        trim_whitespace=False,
    )

    first_name = serializers.CharField(
        max_length=100,
        required=False,
        trim_whitespace=True,
    )

    last_name = serializers.CharField(
        max_length=100,
        required=False,
        trim_whitespace=True,
    )

    def validate_first_name(self, value):
        return self._validate_name(value, _("first name"))

    def validate_last_name(self, value):
        return self._validate_name(value, _("last name"))

    @staticmethod
    def _validate_name(value, field_name):
        """Allow letters and name separators; require at least three letters."""

        value = unicodedata.normalize("NFC", value.strip())

        if not value:
            raise serializers.ValidationError(
                _("Enter your {}.").format(field_name)
            )

        if not value[0].isalpha() or not value[-1].isalpha():
            raise serializers.ValidationError(
                _("Enter a {} that starts and ends with a letter.").format(
                    field_name
                )
            )

        allowed_separators = {" ", "'", "’", "-"}

        for character in value:
            category = unicodedata.category(character)

            if (
                not character.isalpha()
                and not category.startswith("M")
                and character not in allowed_separators
            ):
                raise serializers.ValidationError(
                    _(
                        "Use only letters, spaces, apostrophes, or hyphens "
                        "in the {}."
                    ).format(field_name)
                )

        letter_count = sum(character.isalpha() for character in value)

        if letter_count < 3:
            raise serializers.ValidationError(
                _("Enter a {} with at least three letters.").format(field_name)
            )

        # Collapse repeated spaces without changing capitalization.
        return re.sub(r" +", " ", value)

    def validate_email(self, value):
        """Normalize the email and reject existing accounts or people."""

        normalized = value.strip().lower()

        user_exists = User.objects.filter(email__iexact=normalized).exists()

        person_exists = Person.objects.filter(email__iexact=normalized).exists()

        if user_exists or person_exists:
            raise serializers.ValidationError(
                _("An account with this email already exists.")
            )

        return normalized

    def validate(self, attrs):
        """Validate account-specific fields and password requirements."""

        account_type = attrs["account_type"]
        errors = {}

        if account_type == AccountType.PERSONAL:
            for field in ("first_name", "last_name"):
                if field not in attrs:
                    errors[field] = [
                        _("This field is required for a personal account.")
                    ]

            if "organization" in attrs:
                errors["organization"] = [
                    _(
                        "Organization details must not be submitted "
                        "for a personal account."
                    )
                ]

        elif account_type == AccountType.ORGANIZATION:
            if "organization" not in attrs:
                errors["organization"] = [
                    _(
                        "Organization details are required "
                        "for an organization account."
                    )
                ]

            for field in ("first_name", "last_name"):
                if field in attrs:
                    errors[field] = [
                        _(
                            "Do not submit personal names "
                            "for an organization account."
                        )
                    ]

        if errors:
            raise serializers.ValidationError(errors)

        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {"password_confirmation": [_("Passwords do not match.")]}
            )

        password = attrs["password"]

        if not all(
            (
                re.search(r"[a-z]", password),
                re.search(r"[A-Z]", password),
                re.search(r"\d", password),
                re.search(r"[^A-Za-z0-9\s]", password),
            )
        ):
            raise serializers.ValidationError(
                {
                    "password": [
                        _(
                            "Use uppercase, lowercase, number, "
                            "and symbol characters."
                        )
                    ]
                }
            )

        try:
            validate_password(
                password,
                User(
                    email=attrs["email"],
                    account_type=account_type,
                ),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc

        return attrs

    def create(self, validated_data):
        """Store signup details until the login email is verified."""

        organization_data = validated_data.get("organization", {})

        with transaction.atomic():
            PendingRegistration.objects.filter(
                email__iexact=validated_data["email"],
            ).delete()

            pending = PendingRegistration.objects.create(
                email=validated_data["email"],
                account_type=validated_data["account_type"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                organization_data=dict(organization_data),
                password_hash=make_password(validated_data["password"]),
                code_hash="not-used",
                code_expires_at=timezone.now(),
            )

            create_verification_code(pending)

        return pending


# email verification
class VerifyEmailSerializer(serializers.Serializer):
    """Verify the code and create the appropriate account and profile."""

    pending_id = serializers.IntegerField(
        min_value=1,
        write_only=True,
    )

    code = serializers.CharField(
        min_length=4,
        max_length=4,
        write_only=True,
        trim_whitespace=True,
    )

    def validate_code(self, value):
        """Require exactly four ASCII digits."""

        if not re.fullmatch(r"[0-9]{4}", value):
            raise serializers.ValidationError(
                _("The verification code must contain four digits.")
            )

        return value

    def create(self, validated_data):
        """
        Check the current challenge and create the account atomically.

        Incorrect-code errors are raised after leaving the transaction
        so the failed-attempt increment can be committed.
        """

        error = None
        user = None

        try:
            with transaction.atomic():
                pending = (
                    PendingRegistration.objects.select_for_update()
                    .filter(pk=validated_data["pending_id"])
                    .first()
                )

                if pending is None:
                    error = {
                        "pending_id": [
                            _(
                                "This registration does not exist "
                                "or has already been verified."
                            )
                        ]
                    }

                elif pending.code_expires_at <= timezone.now():
                    error = {
                        "code": [
                            _(
                                "This verification code has expired. "
                                "Request a new code."
                            )
                        ]
                    }

                elif pending.failed_attempts >= 5:
                    error = {
                        "code": [
                            _(
                                "Too many incorrect attempts. "
                                "Request a new code."
                            )
                        ]
                    }

                elif not check_password(
                    validated_data["code"],
                    pending.code_hash,
                ):
                    pending.failed_attempts += 1
                    pending.save(
                        update_fields=[
                            "failed_attempts",
                            "updated_at",
                        ]
                    )

                    error = {"code": [_("The verification code is incorrect.")]}

                else:
                    user = self._create_account(pending)
                    pending.delete()

        except IntegrityError as exc:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        _(
                            "Registration could not be completed because "
                            "of a conflicting database record. "
                            "The account or organization may already exist."
                        )
                    ]
                }
            ) from exc

        if error is not None:
            raise serializers.ValidationError(error)

        return user

    def _create_account(self, pending):
        """Create the login and its personal or organization profile."""

        if User.objects.filter(
            email__iexact=pending.email,
        ).exists():
            raise serializers.ValidationError(
                {"email": [_("An account with this email already exists.")]}
            )

        person = None
        organization_data = None

        if pending.account_type == AccountType.PERSONAL:
            if not pending.first_name or not pending.last_name:
                raise serializers.ValidationError(
                    {
                        "pending_id": [
                            _(
                                "Personal registration details are incomplete. "
                                "Please register again."
                            )
                        ]
                    }
                )

            if Person.objects.filter(
                email__iexact=pending.email,
            ).exists():
                raise serializers.ValidationError(
                    {"email": [_("A person with this email already exists.")]}
                )

            person = Person.objects.create(
                email=pending.email,
                first_name=pending.first_name,
                last_name=pending.last_name,
            )

        elif pending.account_type == AccountType.ORGANIZATION:
            organization_serializer = OrganizationRegistrationSerializer(
                data=pending.organization_data,
            )

            if not organization_serializer.is_valid():
                raise serializers.ValidationError(
                    {"organization": (organization_serializer.errors)}
                )

            organization_data = dict(organization_serializer.validated_data)

        else:
            raise serializers.ValidationError(
                {
                    "account_type": [
                        _("This registration has an invalid account type.")
                    ]
                }
            )

        user = User(
            email=pending.email,
            account_type=pending.account_type,
            person=person,
            status=User.Status.ACTIVE,
            email_verified_at=timezone.now(),
            is_active=True,
        )

        # This is already an encoded Django password.
        # Do not pass it through set_password() again.
        user.password = pending.password_hash
        user.save()

        if organization_data is not None:
            Organization.objects.create(
                owner=user,
                verification_status=Organization.Verification.PENDING,
                **organization_data,
            )

        return user


# Resend a verification code when is expired
class ResendVerificationCodeSerializer(serializers.Serializer):
    """Generate and send a replacement code for a pending registration."""

    pending_id = serializers.IntegerField(
        min_value=1,
        write_only=True,
    )

    def validate(self, attrs):
        """Find the pending registration."""

        try:
            pending = PendingRegistration.objects.get(id=attrs["pending_id"])
        except PendingRegistration.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "pending_id": (
                        _(
                            "This registration does not exist or "
                            "has already been verified."
                        )
                    )
                }
            )

        attrs["pending"] = pending
        return attrs

    def save(self, **kwargs):
        """Generate and email a new verification code."""

        pending = self.validated_data["pending"]

        create_verification_code(pending)

        return pending


class LogoutSerializer(serializers.Serializer):
    """Validate and blacklist the current user's refresh token."""

    refresh = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_refresh(self, value):
        try:
            token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError(
                _("Invalid or expired refresh token.")
            )

        request = self.context["request"]
        user_id_claim = api_settings.USER_ID_CLAIM

        if str(token.get(user_id_claim)) != str(request.user.pk):
            raise serializers.ValidationError(
                _("This refresh token does not belong to your account.")
            )

        self._refresh_token = token
        return value

    def save(self, **kwargs):
        self._refresh_token.blacklist()


class ChangePasswordSerializer(serializers.Serializer):
    """Validate a signed-in user's password change."""

    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=12,
        max_length=128,
        trim_whitespace=False,
    )
    new_password_confirmation = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        user = self.context["request"].user
        current_password = attrs["current_password"]
        new_password = attrs["new_password"]

        if not user.check_password(current_password):
            raise serializers.ValidationError(
                {"current_password": _("Current password is incorrect.")}
            )

        if new_password != attrs["new_password_confirmation"]:
            raise serializers.ValidationError(
                {"new_password_confirmation": _("Passwords do not match.")}
            )

        if user.check_password(new_password):
            raise serializers.ValidationError(
                {"new_password": _("Choose a different password.")}
            )

        if not all(
            (
                re.search(r"[a-z]", new_password),
                re.search(r"[A-Z]", new_password),
                re.search(r"\d", new_password),
                re.search(r"[^A-Za-z0-9\s]", new_password),
            )
        ):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        _(
                            "Use uppercase, lowercase, number, "
                            "and symbol characters."
                        )
                    )
                }
            )

        try:
            validate_password(new_password, user=user)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if not isinstance(exc, DjangoValidationError):
                raise
            raise serializers.ValidationError({"new_password": exc.messages}) from exc

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        return user


class RequestPasswordResetSerializer(serializers.Serializer):
    """Request a recovery code for an existing, active account."""

    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        user = User.objects.filter(
            email__iexact=attrs["email"],
        ).first()

        if user is None:
            raise serializers.ValidationError(
                {"email": _("No account exists with this email address.")}
            )

        if not user.is_active or user.status != User.Status.ACTIVE:
            raise serializers.ValidationError(
                {
                    "email": (
                        _(
                            "Password recovery is not available for this "
                            "account. Please contact support."
                        )
                    )
                }
            )

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        try:
            return create_password_reset_code(self.validated_data["user"])
        except PasswordResetCooldownError as exc:
            raise serializers.ValidationError({"email": str(exc)}) from exc


class ResetPasswordSerializer(serializers.Serializer):
    """Verify an emailed recovery code and replace the account password."""

    email = serializers.EmailField(max_length=254)

    code = serializers.CharField(
        min_length=6,
        max_length=6,
        trim_whitespace=True,
        write_only=True,
    )

    new_password = serializers.CharField(
        min_length=12,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )

    new_password_confirmation = serializers.CharField(
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_code(self, value):
        if not re.fullmatch(r"[0-9]{6}", value):
            raise serializers.ValidationError(
                _("Enter the six-digit code from your recovery email.")
            )

        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirmation"]:
            raise serializers.ValidationError(
                {"new_password_confirmation": _("Passwords do not match.")}
            )

        password = attrs["new_password"]

        if not all(
            (
                re.search(r"[a-z]", password),
                re.search(r"[A-Z]", password),
                re.search(r"\d", password),
                re.search(r"[^A-Za-z0-9\s]", password),
            )
        ):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        _(
                            "Use uppercase, lowercase, number, "
                            "and symbol characters."
                        )
                    )
                }
            )

        user = User.objects.filter(
            email__iexact=attrs["email"],
        ).first()

        if user is None:
            raise serializers.ValidationError(
                {"email": _("No account exists with this email address.")}
            )

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages}) from exc

        attrs["user_id"] = user.pk
        return attrs

    def save(self, **kwargs):
        data = self.validated_data
        error = None
        saved_user = None

        with transaction.atomic():
            # Use the same lock order as the code-creation helper:
            # user first, then recovery challenge.
            user = (
                User.objects.select_for_update()
                .filter(
                    pk=data["user_id"],
                )
                .first()
            )

            if user is None:
                error = {"email": _("No account exists with this email address.")}
            elif not user.is_active or user.status != User.Status.ACTIVE:
                error = {
                    "email": _("Password recovery is unavailable for this account.")
                }
            elif user.email.lower() != data["email"]:
                error = {
                    "email": (
                        _(
                            "The account email has changed. "
                            "Request a new recovery code."
                        )
                    )
                }
            else:
                reset_request = (
                    PasswordResetRequest.objects.select_for_update()
                    .filter(user=user)
                    .first()
                )

                if reset_request is None:
                    error = {
                        "code": (
                            _(
                                "No recovery request exists, or it has already "
                                "been used. Request a new code."
                            )
                        )
                    }
                elif reset_request.code_expires_at <= timezone.now():
                    error = {
                        "code": _("This code has expired. Request a new code.")
                    }
                elif reset_request.failed_attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
                    error = {
                        "code": _("Too many incorrect attempts. Request a new code.")
                    }
                elif not constant_time_compare(
                    reset_request.password_fingerprint,
                    password_reset_fingerprint(user),
                ):
                    reset_request.delete()
                    error = {
                        "code": (
                            _(
                                "The password has changed since this code "
                                "was issued. Request a new code."
                            )
                        )
                    }
                elif not check_password(
                    data["code"],
                    reset_request.code_hash,
                ):
                    reset_request.failed_attempts += 1
                    reset_request.save(update_fields=["failed_attempts", "updated_at"])

                    error = {"code": _("The recovery code is incorrect.")}
                else:
                    user.set_password(data["new_password"])
                    user.save(update_fields=["password", "updated_at"])

                    reset_request.delete()
                    saved_user = user

        # Raise after the transaction so an incorrect-code attempt
        # is committed rather than rolled back by this atomic block.
        if error is not None:
            raise serializers.ValidationError(error)

        return saved_user
