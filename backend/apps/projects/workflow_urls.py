from django.urls import path
from .workflow_views import (
    upload_project_pdf, workflow_detail, select_domain,
    save_description_funding, review_project, post_project,
)

urlpatterns = [
    path("project-workflow/upload-pdf/", upload_project_pdf, name="project-workflow-upload-pdf"),
    path("project-workflow/<int:project_id>/", workflow_detail, name="project-workflow-detail"),
    path("project-workflow/<int:project_id>/domain/", select_domain, name="project-workflow-domain"),
    path("project-workflow/<int:project_id>/description-funding/", save_description_funding, name="project-workflow-description-funding"),
    path("project-workflow/<int:project_id>/review/", review_project, name="project-workflow-review"),
    path("project-workflow/<int:project_id>/post/", post_project, name="project-workflow-post"),
]
