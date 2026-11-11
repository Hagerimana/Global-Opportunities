"""Upload validation for documents.

The checks here are the platform's first line of defence against malicious or
absurd uploads. They are deliberately conservative: a small allowlist of types
and a hard size ceiling, both enforced on the server regardless of what the
client claims.
"""

from django.utils.translation import gettext as _
from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Validates and persists a document upload."""

    class Meta:
        model = Document
        fields = "__all__"
        # These three are recorded by the view from the actual uploaded file, so
        # a client cannot declare its own size or content type.
        read_only_fields = ["uploaded_by_user", "file_size", "mime_type"]

    def validate_file(self, file):
        """Reject files that are too large or of an unapproved type.

        DRF calls this because the field is named `file`, so the error is
        reported against the file input in the response body.

        The MIME type is taken from the multipart headers, which the client
        controls. It is a cheap first filter, not a security boundary; a
        production deployment should additionally confirm the real type by
        inspecting the file's magic bytes, and scan for malware.
        """
        # 10 MB ceiling. Reasonable for scanned certificates and proposals.
        if file.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(_("Files must be 10MB or smaller."))

        # Allowlist: PDF, the two common image formats, and Word documents.
        # Anything else -- executables, archives, HTML, spreadsheets -- is
        # refused.
        if file.content_type not in {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }:
            raise serializers.ValidationError(_("This file type is not permitted."))

        return file
