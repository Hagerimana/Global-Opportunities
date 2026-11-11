"""Routes for the opportunities app, mounted at /api/ by config/urls.py."""

from rest_framework.routers import DefaultRouter

from .views import OpportunityViewSet

# DefaultRouter generates the list route plus the detail route and, because the
# viewset is a ModelViewSet, also the write verbs:
#   GET    /api/opportunities/
#   POST   /api/opportunities/
#   GET    /api/opportunities/{id}/
#   PUT    /api/opportunities/{id}/
#   PATCH  /api/opportunities/{id}/
#   DELETE /api/opportunities/{id}/
router = DefaultRouter()
router.register("opportunities", OpportunityViewSet, basename="opportunity")

urlpatterns = router.urls
