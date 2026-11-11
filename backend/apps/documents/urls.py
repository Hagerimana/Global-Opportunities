"""Routes for the documents app, mounted at /api/ by config/urls.py."""

from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet

# Generates the standard CRUD routes plus the multipart upload handled by the
# same POST:
#   GET  /api/documents/
#   POST /api/documents/          (multipart/form-data, field name "file")
router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = router.urls
