"""Data models for identity and role-based access control.

Three tables live here:

* `User`    -- the custom user model (replaces django.contrib.auth.User)
* `Role`    -- the catalogue of platform roles
* `UserRole`-- the many-to-many join that grants a user one or more roles

`User` deliberately does not extend AbstractUser. We extend AbstractBaseUser
(hashing, last_login, password) plus PermissionsMixin (Django permission
framework) and model only the fields the platform actually needs. `email` is
the login identifier; there is no username.
"""

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models, transaction

from apps.persons.models import Person


class AccountType(models.TextChoices):
    """The account experience selected during registration."""

    PERSONAL = "PERSONAL", "Personal"
    ORGANIZATION = "ORGANIZATION", "Organization"


class UserManager(BaseUserManager):
    """Create users with properly hashed passwords."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and persist a regular user."""

        if not email:
            raise ValueError("An email address is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields,
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create a superuser and its required Person profile."""

        if not email:
            raise ValueError("An email address is required")

        email = self.normalize_email(email)

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("status", User.Status.ACTIVE)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        with transaction.atomic():
            person, _ = Person.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": email.split("@", 1)[0],
                    "last_name": "Administrator",
                },
            )

            return self.create_user(
                email=email,
                password=password,
                person=person,
                **extra_fields,
            )


class User(AbstractBaseUser, PermissionsMixin):
    """A platform account.

    `AbstractBaseUser` supplies password hashing and last_login tracking;
    `PermissionsMixin` supplies is_superuser, groups, and user_permissions so
    the Django admin and DRF permission classes work unchanged.
    """

    class Status(models.TextChoices):
        """Lifecycle of an account.

        PENDING is the state a new registration lands in and is deliberately not
        ACTIVE, so a half-completed signup can never authenticate.
        """

        PENDING = "PENDING"
        ACTIVE = "ACTIVE"
        SUSPENDED = "SUSPENDED"
        BLOCKED = "BLOCKED"
        DEACTIVATED = "DEACTIVATED"

    # Personal accounts link to a Person.
    # Organization accounts have no Person profile.
    # PROTECT preserves a linked person's account/audit relationship.
    person = models.OneToOneField(
        "persons.Person",
        on_delete=models.PROTECT,
        related_name="user",
        null=True,
        blank=True,
    )

    # Login identifier. UNIQUE at the database level.
    email = models.EmailField(unique=True)

    # Account type
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.PERSONAL,
    )

    # Account state; gates whether authentication should succeed at all.
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Set once the emailed verification link is followed. NULL means unverified.
    email_verified_at = models.DateTimeField(null=True, blank=True)

    # Business-facing audit of the last sign-in, kept separate from the
    # `last_login` field that AbstractBaseUser already maintains.
    last_login_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Required by django.contrib.admin. `is_active` is separate from `status`:
    # Django uses it to allow or deny any request at all.
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Tell Django which field is the login handle. No username exists.
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class PendingRegistration(models.Model):
    """Temporary signup details; neither a Person nor a User exists yet."""

    email = models.EmailField(unique=True)
    
    # Required by registration validation for PERSONAL accounts only.
    # Organization registrations store empty strings here.
    first_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )
    last_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.PERSONAL,
    )

    # Validated organization registration details awaiting email verification.
    # Empty for personal registrations. Never store passwords or codes here.
    organization_data = models.JSONField(
        default=dict,
        blank=True,
    )

    # Store Django's encoded password, never the submitted plaintext password.
    password_hash = models.CharField(max_length=255)

    # Store a protected representation of the four-digit code, not the code.
    code_hash = models.CharField(max_length=255)
    code_expires_at = models.DateTimeField()
    failed_attempts = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# Pass word reserting
class PasswordResetRequest(models.Model):
    """Temporary email-code challenge for resetting an existing user's password."""

    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="password_reset_request",
    )

    # Store only the encoded hash, never the plaintext verification code.
    code_hash = models.CharField(max_length=255)

    code_expires_at = models.DateTimeField()

    # Verification failures for the current challenge.
    failed_attempts = models.PositiveSmallIntegerField(default=0)

    # Used to enforce a delay between recovery emails.
    last_sent_at = models.DateTimeField()

    # Bind the challenge to the password state when it was issued.
    # A password change can therefore invalidate an outstanding challenge.
    password_fingerprint = models.CharField(max_length=64)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Password reset request for user {self.user_id}"


class Role(models.Model):
    """A named platform role, e.g. APPLICANT or EVALUATOR.

    Rows are data, not code, so roles can be created and audited by an
    administrator without a deploy. The four MVP roles named in the spec
    (ADMIN, APPLICANT, ORGANIZATION_USER, EVALUATOR) are intended to be seeded
    by a data migration; that seed does not exist yet.
    """

    # Machine-readable identifier used in permission checks and API payloads.
    code = models.CharField(max_length=40, unique=True)
    # Human-readable label for admin dropdowns and audit logs.
    name = models.CharField(max_length=100)
    # What the role is allowed to do, in prose.
    description = models.TextField(blank=True)


class UserRole(models.Model):
    """Grants one role to one user.

    A user may hold several roles at once (for example an evaluator who is also
    an applicant), so this is a genuine many-to-many table rather than a
    single FK on User.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="role_assignments"
    )
    # PROTECT: a role referenced by an assignment must not be deletable, or the
    # grant would silently disappear.
    role = models.ForeignKey(Role, on_delete=models.PROTECT)

    # When the grant was made. Set automatically on insert.
    assigned_at = models.DateTimeField(auto_now_add=True)

    # Which administrator made the grant. SET_NULL keeps the audit record if
    # that administrator's own account is later removed.
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="roles_assigned",
    )

    class Meta:
        constraints = [
            # The same role cannot be granted twice to the same user.
            models.UniqueConstraint(fields=["user", "role"], name="unique_user_role")
        ]
