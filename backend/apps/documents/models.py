"""Uploaded files: identity papers, proposals, budgets, certificates.

A `Document` is a stored file plus the metadata needed to decide whether it may
be shown to somebody. A `DocumentAttachment` then links that file to whatever
it belongs to -- a project, an application, a call, an organisation, or a
funding award -- without duplicating the file record.
"""

from django.db import models


class Document(models.Model):
    """One uploaded file and its verification state."""

    # --- Ownership ------------------------------------------------------------
    # The person or organisation the file belongs to. Both are optional here;
    # the constraint that exactly one must be set is not enforced in this model.
    owner_person = models.ForeignKey(
        "persons.Person", on_delete=models.PROTECT, null=True, blank=True
    )
    owner_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, null=True, blank=True
    )

    # NOTE: a plain CharField with no `choices`. The specification defines ten
    # types (IDENTITY, PROJECT_PROPOSAL, BUDGET, CV, ...) but none are validated.
    document_type = models.CharField(max_length=40)

    # The file itself. The spec also lists `file_name` and `file_url` as
    # separate columns; here the name and URL are derived from the storage
    # backend instead of being duplicated, so a rename cannot desynchronise
    # them. Uploads land under MEDIA_ROOT/documents/ in development.
    file = models.FileField(upload_to="documents/")

    # Recorded at upload time from the request rather than trusted from the
    # client: a browser can claim any content type it likes, so this is a hint
    # for serving and scanning, not proof of the file's real type.
    mime_type = models.CharField(max_length=100)
    # Byte count, recorded server-side so the size limit cannot be spoofed.
    file_size = models.PositiveBigIntegerField()

    # NOTE: a plain CharField with no `choices`. The specification defines
    # PENDING, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED.
    verification_status = models.CharField(max_length=20, default="PENDING")

    # Who verified it and when. SET_NULL so removing a verifier does not delete
    # the document.
    verified_by_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    # Who uploaded it. PROTECT so a document's provenance cannot be erased.
    uploaded_by_user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="documents_uploaded"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # When the document stops being valid -- an ID card that expires, a tax
    # certificate that lapses. Nothing currently acts on this date.
    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class DocumentAttachment(models.Model):
    """Links a stored document to the record it supports.

    `entity_type` plus `entity_id` is a generic foreign key written by hand
    rather than with contenttypes, which keeps the target list closed to the
    handful of entities the platform allows: PROJECT, APPLICATION,
    CALL_FOR_PROJECTS, FUNDING_OPPORTUNITY, ORGANIZATION, FUNDING.
    """

    document = models.ForeignKey(Document, on_delete=models.CASCADE)

    # One of the supported target names, e.g. "PROJECT".
    entity_type = models.CharField(max_length=40)
    # Primary key of the target row.
    entity_id = models.PositiveBigIntegerField()

    # How the document relates to the target, e.g. "proposal" or "budget".
    attachment_type = models.CharField(max_length=40)

    created_at = models.DateTimeField(auto_now_add=True)
