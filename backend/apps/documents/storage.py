"""Private filesystem storage for confidential documents.

Files are accessed through authorized application endpoints.
This storage deliberately does not provide direct browser URLs.
"""

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    """Store confidential files separately from ordinary media."""

    def __init__(self):
        super().__init__(
            location=settings.PRIVATE_DOCUMENT_ROOT,
        )

    def url(self, name):
        raise ValueError(
            "Private documents do not have public URLs. "
            "Use an authorized document-viewing endpoint."
        )


def get_private_document_storage():
    """Return storage for private original files and viewer assets."""

    return PrivateDocumentStorage()
