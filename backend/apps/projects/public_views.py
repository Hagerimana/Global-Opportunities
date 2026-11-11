"""Public project descriptions and authorized private reader images."""

from io import BytesIO
import logging

from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _lazy

from rest_framework import generics, pagination, permissions, status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import (
    project_reader_identity,
    proposal_is_reader_ready,
)
from .models import Project
from .public_queries import (
    public_projects,
    seeking_funding_projects,
    featured_in_progress,
    featured_completed,
)
from .public_serializers import PublicProjectSerializer

logger = logging.getLogger(__name__)


class PublicProjectPagination(pagination.PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


class ProjectHomeView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        response = Response(
            {
                "seeking_funding": PublicProjectSerializer(
                    seeking_funding_projects()[:4],
                    many=True,
                ).data,
                "funded_in_progress": PublicProjectSerializer(
                    featured_in_progress(),
                    many=True,
                ).data,
                "funded_completed": PublicProjectSerializer(
                    featured_completed(),
                    many=True,
                ).data,
            }
        )

        response["Cache-Control"] = "no-store"
        return response


class SeekingFundingListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProjectSerializer
    pagination_class = PublicProjectPagination
    filter_backends = []

    def get_queryset(self):
        queryset = seeking_funding_projects()

        search = self.request.query_params.get("search", "").strip()[:200]

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(problem_statement__icontains=search)
                | Q(location__icontains=search)
            )

        return queryset


class PublicProjectDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProjectSerializer
    filter_backends = []

    def get_queryset(self):
        return public_projects()


class ReaderNotReady(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = _lazy(
        "The project content is not ready for protected reading. "
        "Security checks and page preparation must complete first."
    )
    default_code = "project_content_not_ready"


def private_response(response):
    response["Cache-Control"] = "private, no-store"
    response["Pragma"] = "no-cache"
    response["Vary"] = "Authorization, Cookie"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def document_context(request, pk):
    # Protected reading is not limited to publicly listed projects:
    # accepted Experts and creators may need to read a private draft.
    project = get_object_or_404(Project, pk=pk)

    reader_identity = project_reader_identity(
        user=request.user,
        project=project,
    )

    if reader_identity is None:
        raise PermissionDenied(
            _(
                "Project content is available to its creator, "
                "an accepted invited Expert with an active verified profile, "
                "or an eligible verified organization."
            )
        )

    # Check readiness only after checking the reader's permission.
    proposal = project.proposal_documents.filter(is_current=True).first()

    if proposal is None or not proposal_is_reader_ready(proposal):
        raise ReaderNotReady()

    return reader_identity, project, proposal


# Keep existing class names so current URL imports remain valid.
class OrganizationDocumentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        _reader_identity, project, proposal = document_context(
            request,
            pk,
        )

        response = Response(
            {
                "project": PublicProjectSerializer(project).data,
                "version": proposal.version,
                "page_count": proposal.page_count,
                "pages": [
                    {
                        "page_number": page.page_number,
                        "width": page.width,
                        "height": page.height,
                    }
                    for page in proposal.pages.order_by("page_number")
                ],
            }
        )

        return private_response(response)


class OrganizationDocumentPageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, page_number):
        reader_identity, project, proposal = document_context(
            request,
            pk,
        )

        page = get_object_or_404(
            proposal.pages,
            page_number=page_number,
        )

        try:
            from PIL import Image, ImageDraw, ImageFont

            with page.image.open("rb") as handle:
                with Image.open(handle) as source:
                    if source.width * source.height > 40_000_000:
                        raise ValueError("Image exceeds configured reader limit")

                    image = source.convert("RGB")

            stamp = (
                f"{reader_identity} | account {request.user.pk} | "
                f"{project.reference_number} | "
                f"{timezone.now():%Y-%m-%d %H:%M UTC}"
            )

            stamp = stamp.encode(
                "ascii",
                "replace",
            ).decode("ascii")

            draw = ImageDraw.Draw(image)

            try:
                font = ImageFont.load_default(size=max(14, min(24, image.width // 65)))
            except TypeError:
                font = ImageFont.load_default()

            for y in range(30, image.height, 240):
                # Draw the reader identity once, at the top of the page.
                draw.text(
                    (20, 20),
                    stamp,
                    font=font,
                    fill=(110, 110, 110),
                    stroke_width=1,
                    stroke_fill=(255, 255, 255),
                )

            buffer = BytesIO()
            image.save(buffer, format="PNG")

        except Exception:
            logger.exception(
                "Protected image unavailable for project %s page %s",
                project.pk,
                page_number,
            )

            return private_response(
                Response(
                    {
                        "detail": _(
                            "This project page is temporarily unavailable."
                        ),
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            )

        response = HttpResponse(
            buffer.getvalue(),
            content_type="image/png",
        )

        response["Content-Disposition"] = "inline"

        return private_response(response)
