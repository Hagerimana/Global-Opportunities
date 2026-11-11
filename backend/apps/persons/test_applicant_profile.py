from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User, AccountType
from apps.locations.models import Country, Province, Commune, Locality
from .models import Person
from .applicant_views import ApplicantProfileView
from .applicant_services import assert_personal_information_ready
from rest_framework.exceptions import ValidationError


class ApplicantProfileTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.person = Person.objects.create(
            first_name="Test", last_name="Applicant", email="applicant@example.com",
        )
        self.user = User.objects.create_user(
            email=self.person.email, password="test-password-only",
            person=self.person, status=User.Status.ACTIVE,
            email_verified_at=timezone.now(),
        )
        self.bi, _ = Country.objects.update_or_create(
            code="BI", defaults={"name": "Burundi", "is_active": True},
        )
        Country.objects.update_or_create(
            code="FR", defaults={"name": "France", "is_active": True},
        )
        self.province = Province.objects.create(
            country=self.bi, code="TEST-P1", name="Test province",
        )
        self.other_province = Province.objects.create(
            country=self.bi, code="TEST-P2", name="Other test province",
        )
        self.commune = Commune.objects.create(
            province=self.province, code="TEST-C1", name="Test commune",
        )
        self.locality = Locality.objects.create(
            commune=self.commune, name="Test locality", kind="COLLINE",
            source_zone="Test zone", is_verified=True,
        )

    def call(self, method, data=None, user=None, authenticated=True):
        request = getattr(self.factory, method)(
            "/api/applicant-profile/me/", data=data or {}, format="json",
        )
        if authenticated:
            force_authenticate(request, user=user or self.user)
        return ApplicantProfileView.as_view()(request)

    def test_anonymous_denied(self):
        self.assertIn(self.call("get", authenticated=False).status_code, (401, 403))

    def test_organization_denied(self):
        self.user.account_type = AccountType.ORGANIZATION
        self.user.save(update_fields=["account_type"])
        self.assertEqual(self.call("get").status_code, 403)

    def test_blocked_account_denied(self):
        self.user.status = User.Status.BLOCKED
        self.user.save(update_fields=["status"])
        self.assertEqual(self.call("get").status_code, 403)

    def test_unverified_account_denied(self):
        self.user.email_verified_at = None
        self.user.save(update_fields=["email_verified_at"])
        self.assertEqual(self.call("get").status_code, 403)

    def test_partial_save_and_private_headers(self):
        response = self.call("patch", {"bank_account_number": "000123"})
        self.assertEqual(response.status_code, 200)
        self.person.refresh_from_db()
        self.assertEqual(self.person.bank_account_number, "000123")
        self.assertFalse(response.data["profile"]["completion"]["is_complete"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_identity_or_ownership_cannot_be_submitted(self):
        for field, value in (("id", 999), ("email", "other@example.com"),
                             ("first_name", "Changed"), ("person_id", 999)):
            with self.subTest(field=field):
                self.assertEqual(self.call("patch", {field: value}).status_code, 400)

    def test_another_person_is_not_changed(self):
        other = Person.objects.create(
            first_name="Other", last_name="Person", email="other@example.com",
            bank_name="Other bank",
        )
        self.assertEqual(self.call("patch", {"bank_name": "My bank"}).status_code, 200)
        other.refresh_from_db()
        self.assertEqual(other.bank_name, "Other bank")

    def test_duplicate_interests_rejected(self):
        self.assertEqual(self.call("patch", {
            "interests": ["MUSIC", "MUSIC"],
        }).status_code, 400)

    def test_future_birth_date_rejected(self):
        self.assertEqual(self.call("patch", {
            "date_of_birth": str(timezone.localdate() + timedelta(days=1)),
        }).status_code, 400)

    def test_country_normalization(self):
        response = self.call("patch", {"nationality": " bi "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["nationality"], "BI")

    def test_invalid_country_rejected(self):
        self.assertEqual(self.call("patch", {"nationality": "ZZ"}).status_code, 400)

    def test_mismatched_commune_rejected(self):
        response = self.call("patch", {
            "country_of_residence": "BI", "province_id": self.other_province.pk,
            "commune_id": self.commune.pk,
        })
        self.assertEqual(response.status_code, 400)

    def test_unverified_locality_rejected(self):
        self.locality.is_verified = False
        self.locality.save(update_fields=["is_verified"])
        response = self.call("patch", {
            "country_of_residence": "BI", "province_id": self.province.pk,
            "commune_id": self.commune.pk, "locality_id": self.locality.pk,
        })
        self.assertEqual(response.status_code, 400)

    def test_burundi_selection_and_parent_reset(self):
        response = self.call("patch", {
            "country_of_residence": "BI", "province_id": self.province.pk,
            "commune_id": self.commune.pk, "locality_id": self.locality.pk,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["colline"], self.locality.name)
        response = self.call("patch", {"province_id": self.other_province.pk})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["profile"]["commune_id"])
        self.assertIsNone(response.data["profile"]["locality_id"])
        self.assertEqual(response.data["profile"]["colline"], "")

    def test_changing_country_clears_burundi_links(self):
        self.call("patch", {
            "country_of_residence": "BI", "province_id": self.province.pk,
            "commune_id": self.commune.pk, "locality_id": self.locality.pk,
        })
        response = self.call("patch", {"country_of_residence": "FR"})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["profile"]["province_id"])
        self.assertEqual(response.data["profile"]["province"], "")

    def test_non_burundi_country_rejects_burundi_selectors(self):
        self.assertEqual(self.call("patch", {
            "country_of_residence": "FR", "province_id": self.province.pk,
        }).status_code, 400)

    def test_complete_non_burundi_profile(self):
        response = self.call("patch", {
            "date_of_birth": str(date(2000, 1, 1)), "gender": "Female",
            "phone": "+33123456789", "nationality": "BI",
            "country_of_residence": "FR", "address": "Test address, France",
            "bank_name": "Test bank", "bank_account_number": "000123",
            "interests": ["TECHNOLOGY", "MUSIC"],
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["profile"]["completion"]["is_complete"])
        self.assertNotIn("middle_name", response.data["profile"])
        self.assertNotIn("profile_photo", response.data["profile"])

    def test_posting_guard_rejects_incomplete_profile(self):
        with self.assertRaises(ValidationError):
            assert_personal_information_ready(self.person, self.user)
