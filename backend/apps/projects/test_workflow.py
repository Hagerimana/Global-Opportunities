import io
from datetime import date, timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.persons.models import Person
from apps.professional_profiles.models import ProfessionalDomain
from .models import Project, ProjectExpertInvitation, ProjectProposalDocument


def pdf_bytes(pages=1):
    """Create a real, minimal one-page PDF for upload tests."""

    from io import BytesIO

    from pypdf import PdfWriter

    buffer = BytesIO()
    writer = PdfWriter()

    for _ in range(max(1, pages)):
        writer.add_blank_page(width=612, height=792)

    writer.write(buffer)
    return buffer.getvalue()


class WorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.person = Person.objects.create(
            first_name="Test",
            last_name="Applicant",
            email="applicant@example.com",
        )
        self.user = User.objects.create_user(
            email=self.person.email,
            password="test-password-only",
            person=self.person,
            status=User.Status.ACTIVE,
            email_verified_at=timezone.now(),
        )
        self.client.force_authenticate(self.user)
        from apps.locations.models import Country

        Country.objects.update_or_create(
            code="BI",
            defaults={"name": "Burundi", "is_active": True},
        )
        Country.objects.update_or_create(
            code="FR",
            defaults={"name": "France", "is_active": True},
        )
        self.expert_person = Person.objects.create(
            first_name="Expert",
            last_name="Guide",
            email="expert@example.com",
        )
        self.expert = User.objects.create_user(
            email=self.expert_person.email,
            password="expert-password-only",
            person=self.expert_person,
            status=User.Status.ACTIVE,
            email_verified_at=timezone.now(),
        )
        self.expert.professional_profiles.create(
            profile_type="EXPERT",
            verification_status="VERIFIED",
            is_active=True,
        )
        self.upload_url = reverse("project-workflow-upload-pdf")
        response = self.client.post(
            self.upload_url, {"file": self.pdf_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.project_id = response.data["project_id"]
        self.base = f"/api/project-workflow/{self.project_id}/"

    @staticmethod
    def pdf_file():
        from django.core.files.uploadedfile import SimpleUploadedFile

        return SimpleUploadedFile(
            "proposal.pdf",
            pdf_bytes(),
            content_type="application/pdf",
        )

    def test_upload_creates_private_draft_and_current_pdf(self):
        project = Project.objects.get(pk=self.project_id)
        self.assertEqual(project.status, Project.Status.DRAFT)
        self.assertEqual(project.created_by_user, self.user)
        proposal = project.proposal_documents.get()
        # Upload stores the proposal; asynchronous preparation (worker task
        # projects.prepare_proposal) later makes it reader-ready.
        self.assertEqual(proposal.processing_status, "PENDING")
        self.assertEqual(proposal.scan_status, "NOT_SCANNED")
        self.assertFalse(proposal.is_current)
        self.assertEqual(proposal.page_count, 1)
        self.assertEqual(proposal.original_filename, "proposal.pdf")

    def prepare_proposal(self):
        """Simulate the background worker completing preparation."""

        from .models import ProjectProposalPage

        proposal = ProjectProposalDocument.objects.get(
            project_id=self.project_id
        )
        proposal.processing_status = "READY"
        proposal.scan_status = "CLEAN"
        proposal.is_current = True
        proposal.save(update_fields=[
            "processing_status", "scan_status", "is_current", "updated_at",
        ])
        for number in range(1, proposal.page_count + 1):
            ProjectProposalPage.objects.create(
                proposal=proposal,
                page_number=number,
                image=f"private/page-{number}.png",
                width=600,
                height=800,
            )
        return proposal

    def test_non_pdf_rejected(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        response = self.client.post(
            self.upload_url,
            {
                "file": SimpleUploadedFile(
                    "bad.pdf", b"not a pdf", content_type="application/pdf"
                ),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_domain_requires_pdf(self):
        project = Project.objects.create(created_by_user=self.user)
        response = self.client.patch(
            f"/api/project-workflow/{project.pk}/domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_domain_saved_after_pdf(self):
        response = self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["steps"][1]["is_complete"])

    def test_invalid_domain_rejected(self):
        response = self.client.patch(
            f"{self.base}domain/", {"domain": "INVALID"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def complete_description(self):
        return self.client.patch(
            f"{self.base}description-funding/",
            {
                "title": "Clean water project",
                "problem_statement": "No clean water.",
                "solution": "Install filters.",
                "conclusion": "Sustainable access.",
                "objectives": "Provide water.",
                "expected_results": "Ten filters installed.",
                "target_population": "Rural households.",
                "location": "Gitega, Burundi.",
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=30)),
                "total_budget": "1000.00",
                "requested_amount": "800.00",
                "own_contribution": "200.00",
                "currency": "BIF",
            },
            format="json",
        )

    def test_description_requires_domain_first(self):
        response = self.complete_description()
        self.assertEqual(response.status_code, 400)

    def test_description_saved_after_domain(self):
        self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        response = self.complete_description()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["steps"][2]["is_complete"])

    def test_budget_mismatch_rejected(self):
        self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        response = self.client.patch(
            f"{self.base}description-funding/",
            {
                "title": "X",
                "problem_statement": "P",
                "solution": "S",
                "conclusion": "C",
                "objectives": "O",
                "expected_results": "R",
                "target_population": "T",
                "location": "L",
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=1)),
                "total_budget": "100.00",
                "requested_amount": "90.00",
                "own_contribution": "20.00",
                "currency": "BIF",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_review_requires_all_prior_steps(self):
        response = self.client.get(f"{self.base}review/")
        self.assertEqual(response.status_code, 400)

    def test_personal_information_gate_before_post(self):
        self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        self.complete_description()
        self.client.post(
            "/api/project-expert-invitations/",
            {
                "project_id": self.project_id,
                "expert_user_id": self.expert.pk,
                "message": "Please guide.",
            },
            format="json",
        )
        response = self.client.post(f"{self.base}post/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("personal_information", response.data)

    def test_post_blocked_while_proposal_preparation_is_incomplete(self):
        self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        self.complete_description()
        self.client.post(
            "/api/project-expert-invitations/",
            {
                "project_id": self.project_id,
                "expert_user_id": self.expert.pk,
                "message": "Please guide.",
            },
            format="json",
        )
        self.person.date_of_birth = date(2000, 1, 1)
        self.person.gender = "female"
        self.person.phone = "+25770000000"
        self.person.nationality = "BI"
        self.person.country_of_residence = "FR"
        self.person.address = "Test address, France"
        self.person.bank_name = "Test bank"
        self.person.bank_account_number = "000123"
        self.person.interests = ["TECHNOLOGY"]
        self.person.save()

        # While preparation is still pending, posting must be refused.
        response = self.client.post(f"{self.base}post/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("proposal", response.data)

        # Once the worker has prepared the proposal, posting succeeds.
        self.prepare_proposal()
        response = self.client.post(f"{self.base}post/")
        self.assertEqual(response.status_code, 201, response.data)
        project = Project.objects.get(pk=self.project_id)
        self.assertEqual(project.status, Project.Status.POSTED)
        self.assertIsNotNone(project.posted_at)

    def test_post_requires_valid_invitation_and_completes(self):
        self.client.patch(
            f"{self.base}domain/",
            {"domain": ProfessionalDomain.TECHNOLOGY},
            format="json",
        )
        self.complete_description()
        self.client.post(
            "/api/project-expert-invitations/",
            {
                "project_id": self.project_id,
                "expert_user_id": self.expert.pk,
                "message": "Please guide.",
            },
            format="json",
        )
        self.person.date_of_birth = date(2000, 1, 1)
        self.person.gender = "female"
        self.person.phone = "+25770000000"
        self.person.nationality = "BI"
        self.person.country_of_residence = "FR"
        self.person.address = "Test address, France"
        self.person.bank_name = "Test bank"
        self.person.bank_account_number = "000123"
        self.person.interests = ["TECHNOLOGY"]
        self.person.save()
        self.prepare_proposal()
        response = self.client.post(f"{self.base}post/")
        self.assertEqual(response.status_code, 201, response.data)
        project = Project.objects.get(pk=self.project_id)
        self.assertEqual(project.status, Project.Status.POSTED)
        self.assertIsNotNone(project.posted_at)

    def test_other_users_cannot_access_workflow(self):
        other_person = Person.objects.create(
            first_name="Other",
            last_name="User",
            email="other@example.com",
        )
        other = User.objects.create_user(
            email=other_person.email,
            password="other-password-only",
            person=other_person,
            status=User.Status.ACTIVE,
            email_verified_at=timezone.now(),
        )
        self.client.force_authenticate(other)
        response = self.client.get(self.base)
        self.assertEqual(response.status_code, 404)

    def test_anonymous_denied(self):
        self.client.force_authenticate(None)
        response = self.client.get(self.base)
        self.assertIn(response.status_code, (401, 403))
