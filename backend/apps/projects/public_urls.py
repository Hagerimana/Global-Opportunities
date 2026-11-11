"""Mounted once at /api/public/projects/ in the master URL configuration."""
from django.urls import path
from .public_views import (
    ProjectHomeView, SeekingFundingListView, PublicProjectDetailView,
    OrganizationDocumentView, OrganizationDocumentPageView,
)

urlpatterns = [
    path("home/", ProjectHomeView.as_view(), name="public-project-home"),
    path("", SeekingFundingListView.as_view(), name="public-seeking-funding"),
    path("<int:pk>/", PublicProjectDetailView.as_view(), name="public-project-detail"),
    path("<int:pk>/document/", OrganizationDocumentView.as_view(), name="organization-project-document"),
    path("<int:pk>/document/pages/<int:page_number>/", OrganizationDocumentPageView.as_view(), name="organization-project-page"),
]
