"""Routes for the funding app, mounted at /api/ by config/urls.py."""

from rest_framework.routers import DefaultRouter

from .views import FundingViewSet, DisbursementViewSet, PaymentViewSet

# One router, three registrations, so all three stages of the money chain are
# reachable:
#   /api/funding/        /api/funding/{id}/
#   /api/disbursements/  /api/disbursements/{id}/
#   /api/payments/       /api/payments/{id}/
router = DefaultRouter()
router.register("funding", FundingViewSet)
router.register("disbursements", DisbursementViewSet)
router.register("payments", PaymentViewSet)

urlpatterns = router.urls
