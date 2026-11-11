"""HTTP endpoints for opportunity discovery.

`ModelViewSet` gives the standard REST behaviour in one class: list, retrieve,
create, update, and delete, plus the router-generated URLs.
"""

from rest_framework import viewsets

from .models import Opportunity
from .serializers import OpportunitySerializer


class OpportunityViewSet(viewsets.ModelViewSet):
    """Read/write access to opportunities.

    Filtering and search come from the global DRF settings, so the following
    query parameters work without extra code:
        ?opportunity_type=FUNDING
        ?sector=Education
        ?location=Bujumbura
        ?status=OPEN
        ?online=true
        ?search=climate          (matches title, description, sector, location)
        ?ordering=-application_deadline
        ?page=2
    """

    # select_related pulls the provider organisation in the same query instead of
    # issuing one extra query per row. Ordering by the soonest deadline first
    # matches what a browsing applicant cares about.
    queryset = (
        Opportunity.objects.select_related("provider_organization")
        .all()
        .order_by("application_deadline")
    )

    serializer_class = OpportunitySerializer

    # Exact-match filters, mapped straight onto model fields.
    filterset_fields = ["opportunity_type", "sector", "location", "status", "online"]

    # Free-text search across the columns a visitor would type into the search
    # box.
    search_fields = ["title", "description", "sector", "location"]

    def perform_create(self, serializer):
        """Stamp the creating user from the authenticated request.

        The field is read-only on the serializer, so a client cannot submit
        `created_by_user` and impersonate somebody else.
        """
        serializer.save(created_by_user=self.request.user)
