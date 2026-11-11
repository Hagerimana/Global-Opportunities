"""Project and Expert-invitation routes, mounted at /api/."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .invitation_views import (
    CancelExpertInvitationView,
    ExpertDirectoryView,
    ExpertInvitationDetailView,
    ExpertInvitationListCreateView,
    RespondToExpertInvitationView,
)
from .views import ProjectViewSet
from .workflow_urls import urlpatterns as workflow_urlpatterns

router = DefaultRouter()
router.register(
    "projects",
    ProjectViewSet,
    basename="project",
)

urlpatterns = [
    path(
        "project-experts/",
        ExpertDirectoryView.as_view(),
        name="project-expert-directory",
    ),
    path(
        "project-expert-invitations/",
        ExpertInvitationListCreateView.as_view(),
        name="project-expert-invitation-list",
    ),
    path(
        "project-expert-invitations/<int:pk>/",
        ExpertInvitationDetailView.as_view(),
        name="project-expert-invitation-detail",
    ),
    path(
        "project-expert-invitations/<int:pk>/respond/",
        RespondToExpertInvitationView.as_view(),
        name="project-expert-invitation-respond",
    ),
    path(
        "project-expert-invitations/<int:pk>/cancel/",
        CancelExpertInvitationView.as_view(),
        name="project-expert-invitation-cancel",
    ),
    
]

urlpatterns += router.urls
urlpatterns += workflow_urlpatterns
