"""Organisation records: the legal entities that publish and fund opportunities.

An organization is a first-class actor in the platform. It can act as an
opportunity provider, a funder, a project owner, or an applicant, depending on
which roles its members hold.
"""

from django.db import models
from django.conf import settings

class Organization(models.Model):
    """A registered organisation and its verification state."""

    class Type(models.TextChoices):
        """Legal nature of the organisation.

        The list is exhaustive on purpose: eligibility criteria can filter on
        ORGANIZATION_TYPE, and an open free-text field would make that filter
        unreliable.
        """

        GOVERNMENT = "GOVERNMENT"
        PUBLIC_INSTITUTION = "PUBLIC_INSTITUTION"
        PRIVATE_COMPANY = "PRIVATE_COMPANY"
        NGO = "NGO"
        NON_PROFIT = "NON_PROFIT"
        ASSOCIATION = "ASSOCIATION"
        COOPERATIVE = "COOPERATIVE"
        FOUNDATION = "FOUNDATION"
        FINANCIAL_INSTITUTION = "FINANCIAL_INSTITUTION"
        EDUCATIONAL_INSTITUTION = "EDUCATIONAL_INSTITUTION"
        RESEARCH_INSTITUTION = "RESEARCH_INSTITUTION"
        OTHER = "OTHER"

    class Verification(models.TextChoices):
        """Where the organisation sits in the verification workflow.

        An organisation stays PENDING until an administrator checks its
        registration documents, so an unverified body can never be trusted to
        publish a call.
        """

        PENDING = "PENDING"
        UNDER_REVIEW = "UNDER_REVIEW"
        VERIFIED = "VERIFIED"
        REJECTED = "REJECTED"
        SUSPENDED = "SUSPENDED"

    # The login account responsible for managing this organization.
    # OrganizationMember remains separate and will be implemented later.
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_organizations",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=40, choices=Type.choices)
    # The official registration number. UNIQUE because two organisations cannot
    # share one, and it is the key an administrator verifies against.
    registration_number = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # --- Contact --------------------------------------------------------------
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    website = models.URLField(blank=True)

    # --- Administrative address ----------------------------------------------
    address = models.TextField()
    province = models.CharField(max_length=100)
    commune = models.CharField(max_length=100)

    # Gates which actions the organisation may perform (publishing, funding).
    verification_status = models.CharField(
        max_length=20, choices=Verification.choices, default=Verification.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OrganizationMember(models.Model):
    """Links a Person to an Organization they belong to.

    Membership is what turns an individual into an "organization user": the role
    lives on the user, but the authority to act for the body comes from here.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="members"
    )
    person = models.ForeignKey("persons.Person", on_delete=models.CASCADE)

    # Free text, e.g. "Programme Director". Not an enum, because the title
    # vocabulary differs per organisation type.
    position = models.CharField(max_length=100, blank=True)

    # Marks the person who should be contacted about this organisation. The
    # model does not enforce a single primary contact per organisation.
    is_primary_contact = models.BooleanField(default=False)

    # Membership period. `left_at` NULL means the membership is current.
    joined_at = models.DateField()
    left_at = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # The same person cannot be enrolled in the same organisation twice.
            models.UniqueConstraint(
                fields=["organization", "person"], name="unique_organization_member"
            )
        ]
