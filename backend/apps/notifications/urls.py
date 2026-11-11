"""Routes for the notifications app, mounted at /api/ by config/urls.py."""

from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet

# ReadOnlyModelViewSet contributes:
#   GET /api/notifications/
#   GET /api/notifications/{id}/
# and the `read` @action on the viewset adds:
#   PATCH /api/notifications/{id}/read/
router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = router.urls
