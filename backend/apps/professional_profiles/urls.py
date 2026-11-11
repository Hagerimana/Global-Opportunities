"""Professional-profile draft endpoints."""

from django.urls import path

from .views import (
    DevelopmentProfileApprovalView,
    ProfileOptionsView,
    ProfileRequestDetailView,
    ProfileRequestListCreateView,
)

urlpatterns = [
    path(
        "options/",
        ProfileOptionsView.as_view(),
        name="professional-profile-options",
    ),
    path(
        "requests/",
        ProfileRequestListCreateView.as_view(),
        name="professional-profile-request-list",
    ),
    path(
        "requests/<int:pk>/",
        ProfileRequestDetailView.as_view(),
        name="professional-profile-request-detail",
    ),
    path(
        "requests/<int:pk>/development-approve/",
        DevelopmentProfileApprovalView.as_view(),
        name="professional-profile-development-approve",
    ),
]
