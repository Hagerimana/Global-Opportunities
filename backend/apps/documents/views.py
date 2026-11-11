"""HTTP endpoints for document upload and retrieval.

Files are private: a document belongs to the person or organisation that
uploaded it, and the queryset enforces that.
"""

from rest_framework import permissions, viewsets

from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """Upload, list, and manage the requesting user's own documents."""

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only documents the requesting user uploaded.

        This is the access-control boundary: because it applies to every action,
        a user cannot read or download another applicant's identity document by
        guessing its id.
        """
        return Document.objects.filter(uploaded_by_user=self.request.user)

    def perform_create(self, s):
        """Record the upload's real size and content type, then save.

        Both values are read off the uploaded file itself rather than taken from
        the request body, so a client cannot lie about them. The size in
        particular is what the 10 MB limit is enforced against.
        """
        file = self.request.FILES["file"]
        s.save(
            uploaded_by_user=self.request.user,
            file_size=file.size,
            mime_type=file.content_type,
        )
