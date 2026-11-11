"""HTTP endpoints for applications, including the submit transition."""

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Application
from .serializers import ApplicationSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD over the requesting user's own applications.

    The queryset is filtered to `submitted_by_user`, so an applicant can only
    ever see and modify their own submissions -- including through the detail
    route, where get_object() applies the same filter.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only applications submitted by the requesting user."""
        return Application.objects.filter(submitted_by_user=self.request.user)

    def perform_create(self, serializer):
        """Stamp the submitting user from the request.

        A new application always starts in DRAFT; submitting is a separate,
        explicit action.
        """
        serializer.save(submitted_by_user=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """POST /api/applications/{id}/submit/ -- move an application to SUBMITTED.

        This is the one state transition an applicant is allowed to make. It is
        guarded twice: the view only operates on applications already scoped to
        the caller by get_queryset(), and it refuses anything not in DRAFT, so a
        request can never be replayed to re-submit or overwrite a decision.
        """
        with transaction.atomic():
            # get_object() raises 404 unless this application belongs to the
            # caller, so this is also the authorisation check.
            application = self.get_object()

            if application.status != Application.Status.DRAFT:
                return Response(
                    {"detail": _("Only draft applications can be submitted.")},
                    status=400,
                )

            application.status = Application.Status.SUBMITTED
            # Server-generated timestamp; the client cannot influence it.
            application.submitted_at = timezone.now()
            # Restrict the UPDATE to the two columns actually changing.
            application.save(update_fields=["status", "submitted_at"])

        return Response(ApplicationSerializer(application).data)
