"""Tests for professional-profile draft creation."""

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import AccountType, User, UserRole
from apps.persons.models import Person

from .models import (
    ProfileDocumentRequirement,
    ProfileType,
    ProfessionalProfile,
    ProfessionalProfileRequest,
    ProfessionalProfileRequestEvent,
)
from .services import create_profile_request


class CreateProfileRequestTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "seed_professional_requirements",
            verbosity=0,
        )

        person = Person.objects.create(
            first_name="Alice",
            last_name="Martin",
            email="alice@example.test",
        )

        cls.user = User.objects.create_user(
            email="alice@example.test",
            password="TestOnly!Profile928",
            person=person,
            account_type=AccountType.PERSONAL,
            status=User.Status.ACTIVE,
            is_active=True,
            email_verified_at=timezone.now(),
        )

    def test_creates_draft_requirements_and_history(self):
        application = create_profile_request(
            user=self.user,
            requested_role=ProfileType.MENTOR,
        )

        self.assertEqual(
            application.status,
            ProfessionalProfileRequest.Status.DRAFT,
        )
        self.assertEqual(
            application.request_type,
            ProfessionalProfileRequest.RequestType.INITIAL,
        )
        self.assertEqual(
            application.document_requirements.count(),
            7,
        )
        self.assertEqual(application.events.count(), 1)

        event = application.events.get()

        self.assertEqual(
            event.event_type,
            ProfessionalProfileRequestEvent.EventType.CREATED,
        )

        self.assertFalse(
            ProfessionalProfile.objects.filter(
                user=self.user,
                is_active=True,
            ).exists()
        )

    def test_organization_account_is_rejected(self):
        organization_user = User.objects.create_user(
            email="organization@example.test",
            password="TestOnly!Profile928",
            account_type=AccountType.ORGANIZATION,
            status=User.Status.ACTIVE,
            is_active=True,
            email_verified_at=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            create_profile_request(
                user=organization_user,
                requested_role=ProfileType.EXPERT,
            )

        self.assertFalse(
            ProfessionalProfileRequest.objects.filter(
                user=organization_user,
            ).exists()
        )

    def test_unverified_account_is_rejected(self):
        self.user.email_verified_at = None
        self.user.save(update_fields=["email_verified_at"])

        with self.assertRaises(ValidationError):
            create_profile_request(
                user=self.user,
                requested_role=ProfileType.MENTOR,
            )

    def test_existing_profile_is_preserved_during_switch(self):
        existing_profile = ProfessionalProfile.objects.create(
            user=self.user,
            profile_type=ProfileType.MENTOR,
            domain="BUSINESS",
            biography="Existing approved biography.",
            verification_status=(ProfessionalProfile.Verification.VERIFIED),
            is_active=True,
            activated_at=timezone.now(),
        )

        application = create_profile_request(
            user=self.user,
            requested_role=ProfileType.TRAINER,
            domain="EDUCATION",
        )

        existing_profile.refresh_from_db()

        self.assertEqual(
            application.request_type,
            ProfessionalProfileRequest.RequestType.PROFILE_SWITCH,
        )
        self.assertEqual(
            application.previous_profile_id,
            existing_profile.pk,
        )
        self.assertTrue(existing_profile.is_active)
        self.assertEqual(
            existing_profile.biography,
            "Existing approved biography.",
        )
        self.assertEqual(
            ProfessionalProfile.objects.filter(
                user=self.user,
                is_active=True,
            ).count(),
            1,
        )

    def test_requirement_snapshot_preserves_original_rules(self):
        requirement = ProfileDocumentRequirement.objects.get(
            profile_type=ProfileType.MENTOR,
            code="cv",
        )

        original_size = requirement.max_file_size

        application = create_profile_request(
            user=self.user,
            requested_role=ProfileType.MENTOR,
        )

        requirement.max_file_size = original_size + 1024
        requirement.save(update_fields=["max_file_size"])

        application_requirement = application.document_requirements.get(
            requirement=requirement,
        )

        self.assertEqual(
            application_requirement.configuration_snapshot["max_file_size"],
            original_size,
        )

    def test_invalid_role_creates_no_application(self):
        with self.assertRaises(ValidationError):
            create_profile_request(
                user=self.user,
                requested_role="INVALID",
            )

        self.assertEqual(
            ProfessionalProfileRequest.objects.count(),
            0,
        )


class DevelopmentApprovalTests(TestCase):
    """The development-only shortcut must complete when it is enabled."""

    @classmethod
    def setUpTestData(cls):
        call_command(
            "seed_professional_requirements",
            verbosity=0,
        )

        person = Person.objects.create(
            first_name="Bruno",
            last_name="Dev",
            email="bruno@example.test",
        )

        cls.user = User.objects.create_user(
            email="bruno@example.test",
            password="TestOnly!Profile928",
            person=person,
            account_type=AccountType.PERSONAL,
            status=User.Status.ACTIVE,
            is_active=True,
            email_verified_at=timezone.now(),
        )

    def test_auto_approval_completes_when_enabled(self):
        # Regression test: the approval path only runs when the
        # development gate is enabled, which the DEBUG=False test
        # environment never exercises on its own.
        with override_settings(
            DEBUG=True,
            PROFESSIONAL_PROFILES_AUTO_APPROVE=True,
        ):
            application = create_profile_request(
                user=self.user,
                requested_role=ProfileType.EXPERT,
                domain="TECHNOLOGY",
                biography="Demonstration biography.",
                qualifications="Demonstration qualifications.",
                years_experience=5,
                professional_title="Consultant",
            )

        self.assertEqual(
            application.status,
            ProfessionalProfileRequest.Status.APPROVED,
        )
        self.assertTrue(application.development_auto_approved)

        profile = ProfessionalProfile.objects.get(
            user=self.user,
            profile_type=ProfileType.EXPERT,
        )

        self.assertEqual(
            application.resulting_profile_id,
            profile.pk,
        )
        self.assertEqual(
            profile.verification_status,
            ProfessionalProfile.Verification.VERIFIED,
        )
        self.assertTrue(profile.is_active)
        self.assertTrue(
            UserRole.objects.filter(
                user=self.user,
                role__code=ProfileType.EXPERT,
            ).exists(),
        )
        self.assertTrue(
            application.events.filter(
                event_type=(
                    ProfessionalProfileRequestEvent.EventType.DEVELOPMENT_APPROVED
                ),
            ).exists(),
        )

    def test_disabled_approval_leaves_draft(self):
        application = create_profile_request(
            user=self.user,
            requested_role=ProfileType.EXPERT,
            domain="TECHNOLOGY",
        )

        self.assertEqual(
            application.status,
            ProfessionalProfileRequest.Status.DRAFT,
        )
        self.assertFalse(application.development_auto_approved)
        self.assertFalse(
            ProfessionalProfile.objects.filter(user=self.user).exists(),
        )
