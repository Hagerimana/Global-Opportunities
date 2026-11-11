"""Routes for the applications app, mounted at /api/ by config/urls.py."""

from rest_framework.routers import DefaultRouter

from .views import ApplicationViewSet

# The ModelViewSet contributes the CRUD routes, and the `submit` @action
# declared on the viewset adds:
#   POST /api/applications/{id}/submit/
router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="application")

urlpatterns = router.urls
