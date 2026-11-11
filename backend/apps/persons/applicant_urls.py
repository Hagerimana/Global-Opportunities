from django.urls import path
from .applicant_views import ApplicantProfileView

urlpatterns = [
    path("me/", ApplicantProfileView.as_view(), name="applicant-personal-information"),
]
