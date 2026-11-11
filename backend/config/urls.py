"""Root URL configuration -- the single place every API route is assembled.

Each domain app exposes its own `urls.py` with a DRF router; this file only
mounts those routers under `/api/...`. Apps without a urls.py (calls,
evaluations, organizations, persons) currently contribute no routes, which is
why those parts of the API surface documented in the spec are not reachable.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django's built-in data browser. Useful in development; consider removing
    # or restricting it in production.
    path("admin/", admin.site.urls),
    # --- Identity -------------------------------------------------------------
    # POST /api/auth/register/  create an account
    # POST /api/auth/login/     obtain an access + refresh token pair
    # POST /api/auth/refresh/   rotate an access token
    # (logout, email verification, and password reset are specified but not
    # implemented yet -- see the gap analysis in README.md)
    path("api/auth/", include("apps.accounts.urls")),
    # Professional-profile applications.
    path(
        "api/professional-profiles/",
        include("apps.professional_profiles.urls"),
    ),
    # --- Discovery ------------------------------------------------------------
    # GET/POST /api/opportunities/  and /api/opportunities/{id}/
    path("api/", include("apps.opportunities.urls")),
    # --- Project lifecycle ----------------------------------------------------
    # GET/POST /api/projects/  and /api/projects/{id}/
    path("api/", include("apps.projects.urls")),
    # GET/POST /api/applications/  plus POST /api/applications/{id}/submit/
    path("api/", include("apps.applications.urls")),
    # --- Money ----------------------------------------------------------------
    # /api/funding/, /api/disbursements/, /api/payments/
    path("api/", include("apps.funding.urls")),
    # --- Paperwork ------------------------------------------------------------
    # GET/POST /api/documents/
    path("api/", include("apps.documents.urls")),
    # --- User inbox -----------------------------------------------------------
    # GET /api/notifications/  plus PATCH /api/notifications/{id}/read/
    path("api/", include("apps.notifications.urls")),
    # -----message--------------------------------------------------------------
    path(
        "api/messaging/",
        include("apps.messaging.urls"),
    ),
    # --- AI -------------------------------------------------------------------
    # POST /api/ai/chat/
    path("api/ai/", include("apps.ai_assistant.urls")),
    # -----------------------------------------------------------------------
    path(
        "api/locations/",
        include("apps.locations.urls"),
    ),
    path(
        "api/applicant-profile/",
        include("apps.persons.applicant_urls"),
    ),
    path(
        "api/public/projects/",
        include("apps.projects.public_urls"),
    ),
]
