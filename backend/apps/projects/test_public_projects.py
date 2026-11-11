"""Homepage ordering, public privacy, and organization document policy tests."""
from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.persons.models import Person
from apps.organizations.models import Organization
from apps.funding.models import Funding
from .models import Project, ProjectProposalDocument, ProjectProposalPage
from .access import can_view_project_proposal
from .public_queries import seeking_funding_projects


class PublicProjectsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()
        self.owner = self.user("owner@example.com")
        self.organization_user = self.user("org@example.com", organization=True)
        self.organization = Organization.objects.create(
            owner=self.organization_user, name="Test foundation", organization_type="FOUNDATION",
            registration_number="TEST-REG-1", email="org@example.com", phone="000",
            address="Test address", province="Gitega", commune="Gitega", verification_status="VERIFIED",
        )

    def user(self, email, organization=False):
        person = None if organization else Person.objects.create(first_name="Test", last_name="User", email=email)
        return User.objects.create_user(
            email=email, password="test-only-password", person=person,
            account_type="ORGANIZATION" if organization else "PERSONAL",
            status="ACTIVE", email_verified_at=timezone.now(),
        )

    def project(self, title="Example", days=0, **fields):
        defaults = dict(
            created_by_user=self.owner, title=title, domain="TECHNOLOGY", status="POSTED",
            posted_at=self.now + timedelta(days=days), requested_amount=Decimal("80.00"),
            own_contribution=Decimal("20.00"), total_budget=Decimal("100.00"), currency="BIF",
            problem_statement="Problem", solution="Solution", conclusion="Conclusion",
        )
        defaults.update(fields)
        return Project.objects.create(**defaults)

    def award(self, project, status="APPROVED", amount="80.00"):
        return Funding.objects.create(
            project=project, provider_organization=self.organization, funding_type="GRANT",
            amount=Decimal(amount), approved_amount=Decimal(amount), currency="BIF",
            start_date=self.now.date(), end_date=self.now.date() + timedelta(days=30),
            status=status, created_by_user=self.organization_user,
        )

    def proposal(self, project, scan="CLEAN", rendered=True):
        proposal = ProjectProposalDocument.objects.create(
            project=project, uploaded_by_user=self.owner, version=1,
            original_file="private/test.pdf", original_filename="test.pdf", file_size=100,
            page_count=1, processing_status="READY", scan_status=scan, is_current=True,
        )
        if rendered:
            ProjectProposalPage.objects.create(
                proposal=proposal, page_number=1, image="private/page.png", width=600, height=800,
            )
        return proposal

    def test_homepage_is_anonymous_and_four_newest(self):
        projects = [self.project(str(i), days=i) for i in range(6)]
        response = self.client.get("/api/public/projects/home/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["id"] for p in response.data["seeking_funding"]], [p.pk for p in projects[-1:-5:-1]])

    def test_drafts_and_unposted_never_public(self):
        draft = self.project(status="DRAFT")
        unposted = self.project(posted_at=None)
        cancelled = self.project(status="CANCELLED")
        for p in (draft, unposted, cancelled):
            self.assertEqual(self.client.get(f"/api/public/projects/{p.pk}/").status_code, 404)

    def test_pending_cancelled_and_zero_awards_do_not_mean_funded(self):
        pending, cancelled, zero = self.project(), self.project(), self.project()
        self.award(pending, "PENDING")
        self.award(cancelled, "CANCELLED")
        self.award(zero, "APPROVED", "0.00")
        self.assertEqual(seeking_funding_projects().count(), 3)

    def test_approved_award_removes_project_from_seeking_funding(self):
        project = self.project()
        self.award(project)
        self.assertFalse(seeking_funding_projects().filter(pk=project.pk).exists())

    def test_in_progress_cap_order_and_four_limit(self):
        selected = []
        for progress in (20, 50, 70, 80, 90, 95):
            project = self.project(str(progress), status="IN_PROGRESS", progress_percentage=progress)
            self.award(project)
            selected.append(project)
        response = self.client.get("/api/public/projects/home/")
        self.assertEqual([p["title"] for p in response.data["funded_in_progress"]], ["90", "80", "70", "50"])

    def test_unknown_progress_is_not_invented(self):
        project = self.project(status="IN_PROGRESS", progress_percentage=None)
        self.award(project)
        self.assertEqual(self.client.get("/api/public/projects/home/").data["funded_in_progress"], [])

    def test_completed_order_uses_completion_date(self):
        for i in range(6):
            project = self.project(str(i), days=10-i, status="COMPLETED", progress_percentage=100, completed_at=self.now + timedelta(days=i))
            self.award(project)
        response = self.client.get("/api/public/projects/home/")
        self.assertEqual([p["title"] for p in response.data["funded_completed"]], ["5", "4", "3", "2"])

    def test_funding_completion_does_not_complete_project(self):
        project = self.project(status="IN_PROGRESS", progress_percentage=50)
        self.award(project, status="COMPLETED")
        response = self.client.get("/api/public/projects/home/")
        self.assertEqual(len(response.data["funded_in_progress"]), 1)
        self.assertEqual(response.data["funded_completed"], [])

    def test_public_serializer_never_exposes_private_fields(self):
        project = self.project()
        self.proposal(project)
        response = self.client.get(f"/api/public/projects/{project.pk}/")
        self.assertEqual(response.status_code, 200)
        for field in ("created_by_user", "person", "bank_name", "bank_account_number", "original_file", "proposal_documents", "sha256"):
            self.assertNotIn(field, response.data)
        self.assertNotIn("private/test.pdf", str(response.data))

    def test_public_list_is_paginated(self):
        for i in range(13): self.project(str(i))
        response = self.client.get("/api/public/projects/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 13)
        self.assertEqual(len(response.data["results"]), 12)
        self.assertIsNotNone(response.data["next"])

    def test_multiple_awards_do_not_duplicate_cards(self):
        project = self.project(status="IN_PROGRESS", progress_percentage=90)
        self.award(project); self.award(project)
        self.assertEqual(len(self.client.get("/api/public/projects/home/").data["funded_in_progress"]), 1)

    def test_document_anonymous_denied(self):
        project = self.project(); self.proposal(project)
        self.assertIn(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, (401, 403))

    def test_document_unrelated_personal_user_denied_on_organization_route(self):
        project = self.project(); self.proposal(project)
        stranger = self.user("stranger@example.com")
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 403)

    def test_unverified_organization_denied(self):
        project = self.project(); self.proposal(project)
        self.organization.verification_status="PENDING"; self.organization.save()
        self.client.force_authenticate(self.organization_user)
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 403)

    def test_verified_organization_gets_metadata_not_original_url(self):
        project = self.project(); self.proposal(project)
        self.client.force_authenticate(self.organization_user)
        response = self.client.get(f"/api/public/projects/{project.pk}/document/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["page_count"], 1)
        self.assertNotIn("private/", str(response.data))
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_unscanned_pdf_stays_blocked(self):
        project = self.project(); self.proposal(project, scan="UNAVAILABLE")
        self.client.force_authenticate(self.organization_user)
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 409)

    def test_missing_rendered_pages_stays_blocked(self):
        project = self.project(); self.proposal(project, rendered=False)
        self.client.force_authenticate(self.organization_user)
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 409)

    def test_expert_profile_and_accepted_invitation_grant_document_access(self):
        from .models import ProjectExpertInvitation
        project = self.project(); proposal = self.proposal(project)
        expert = self.user("expert@example.com")
        expert.professional_profiles.create(profile_type="EXPERT", domain="TECHNOLOGY", verification_status="VERIFIED", is_active=True)
        invitation = ProjectExpertInvitation.objects.create(
            project=project, expert_user=expert, invited_by_user=self.owner,
            status="ACCEPTED", expires_at=self.now + timedelta(days=7),
        )
        self.assertTrue(can_view_project_proposal(user=expert, proposal_id=proposal.pk))
        self.client.force_authenticate(expert)
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 200)

        # Revoked access must take effect immediately.
        invitation.access_revoked_at = self.now
        invitation.save(update_fields=["access_revoked_at"])
        self.assertFalse(can_view_project_proposal(user=expert, proposal_id=proposal.pk))
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/").status_code, 403)

    def test_organization_revocation_rechecked_for_page_requests(self):
        project=self.project(); self.proposal(project)
        self.client.force_authenticate(self.organization_user)
        self.organization.verification_status="SUSPENDED"; self.organization.save()
        self.assertEqual(self.client.get(f"/api/public/projects/{project.pk}/document/pages/1/").status_code, 403)

    def test_creator_can_still_preview_in_private_policy(self):
        project = self.project(status="DRAFT", posted_at=None)
        proposal = self.proposal(project)
        self.assertTrue(can_view_project_proposal(user=self.owner, proposal_id=proposal.pk))
