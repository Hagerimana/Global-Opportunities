"""HTTP endpoints for the money chain.

SECURITY NOTE, verified against the specification's requirement for
object-level permissions: these three viewsets declare only
`IsAuthenticated` and their querysets are unscoped. Any logged-in user can
therefore read every funding record, disbursement, and payment in the platform,
and can create or modify them. Before this API is exposed, each viewset needs a
`get_queryset()` scoped to the caller's organisation and a role check limiting
writes to ADMIN and ORGANIZATION_USER.
"""

from django.db import transaction
from rest_framework import permissions, viewsets

from .models import Funding, Disbursement, Payment
from .serializers import FundingSerializer, DisbursementSerializer, PaymentSerializer


class FundingViewSet(viewsets.ModelViewSet):
    """CRUD over funding awards."""

    # NOTE: unscoped. Should be filtered to the funder's own organisation.
    queryset = Funding.objects.all()
    serializer_class = FundingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, s):
        """Record the award inside a database transaction.

        The transaction guarantees the award and any cascading side effects
        commit together or not at all. It also means the model's financial
        checks and the row write are one atomic unit.
        """
        with transaction.atomic():
            s.save(created_by_user=self.request.user)


class DisbursementViewSet(viewsets.ModelViewSet):
    """CRUD over disbursement instalments.

    No perform_create override: the model-level `clean()` check on the
    cumulative total is the guard here, and it is not invoked automatically by
    DRF, so a dedicated creation path is still needed.
    """

    # NOTE: unscoped, same exposure as the other two viewsets.
    queryset = Disbursement.objects.all()
    serializer_class = DisbursementSerializer
    permission_classes = [permissions.IsAuthenticated]


class PaymentViewSet(viewsets.ModelViewSet):
    """CRUD over payments made against a disbursement."""

    # NOTE: unscoped, same exposure as the other two viewsets.
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, s):
        """Record the payment inside a database transaction.

        Transactional because a payment is the step most likely to be retried by
        a client or a payment integration; wrapping the write keeps a partial
        record from being committed.
        """
        with transaction.atomic():
            s.save(created_by_user=self.request.user)
