"""Django settings for the Global Opportunities backend.

Single source of truth for the whole backend: installed apps, security
switches, database, CORS, DRF behaviour, JWT lifetimes, and Celery.

Configuration comes from environment variables (loaded from `backend/.env` in
development) so that no secret is ever committed. Copy `.env.example` to `.env`
and fill it in before running the project.
"""

from datetime import timedelta
import os
from pathlib import Path

from dotenv import load_dotenv

from decouple import config

# backend/ -- the directory that contains manage.py. Every path below is
# resolved relative to it so the app works regardless of the shell's cwd.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load variables from backend/.env. `override=False` (the default) means real
# environment variables win over the .env file, which is what we want in
# production where the platform injects secrets.
load_dotenv(BASE_DIR / ".env")


# --- Core security -----------------------------------------------------------

# Signing key for sessions, password reset tokens, and anything signed.
# The fallback exists only so `manage.py check` runs on a fresh clone; a real
# deployment MUST set DJANGO_SECRET_KEY or sessions become forgeable.
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "unsafe-development-key",
)

# Never hard-code True in production: DEBUG=True leaks stack traces and local
# settings to any visitor.
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"

# Comma-separated allowlist of hostnames this server will answer for. Anything
# not listed is rejected with HTTP 400, which blocks Host-header attacks.
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1",
    ).split(",")
    if host.strip()
]


# --- Applications ------------------------------------------------------------

# Django contrib apps, then the third-party stack, then our 13 domain apps.
# Order matters only for template/static resolution; our apps are grouped last
# and follow the folder layout under `apps/`.
INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "corsheaders",  # lets the Next.js dev server on :3000 call us
    "rest_framework",  # Django REST Framework
    "rest_framework_simplejwt",  # JWT issue/refresh endpoints
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",  # ?status=&?sector= style filtering
    # Domain apps -- identity
    "apps.persons",  # natural-person data (profile, address, photo)
    "apps.locations.apps.LocationsConfig",
    "apps.accounts",  # custom User, Role, UserRole (RBAC tables)
    "apps.professional_profiles.apps.ProfessionalProfilesConfig",
    "apps.organizations",  # organizations and their members
    
    # Discovery
    "apps.opportunities",  # generic Opportunity + funding specialisation
    "apps.calls",  # calls for projects + criteria (models only today)
    # Project lifecycle
    "apps.projects",  # projects, owners, activities
    "apps.proposal_preparation.apps.ProposalPreparationConfig",
    "apps.applications",  # applications and selection decisions
    "apps.evaluations",  # evaluator assignments and scores (models only)
    # Money and paperwork
    "apps.funding",  # funding, disbursements, payments
    "apps.documents",  # uploaded files and their attachments
    "apps.notifications",  # in-app notification feed
    "apps.ai_assistant",  # grounded AI guidance endpoint
    "apps.messaging.apps.MessagingConfig",
]


# --- Middleware --------------------------------------------------------------

# Executed top to bottom on the way in, bottom to top on the way out.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",  # HSTS, redirect, secure cookies
    "django.contrib.sessions.middleware.SessionMiddleware",  # session for admin/templates
    # Reads the Accept-Language header and activates the matching locale for
    # every request, so gettext() in views and serializers returns the right
    # language. Must sit after SessionMiddleware and before CommonMiddleware.
    "django.middleware.locale.LocaleMiddleware",
    # CORS must sit above CommonMiddleware so preflight OPTIONS requests are
    # answered before anything else touches the response.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",  # APPEND_SLASH, etc.
    "django.middleware.csrf.CsrfViewMiddleware",  # CSRF protection
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",  # blocks clickjacking
]


# --- URL / template plumbing -------------------------------------------------

# Root URL configuration: all API routes are composed in config/urls.py.
ROOT_URLCONF = "config.urls"


# Django templates. The API returns JSON, but the admin site renders HTML, so
# the template engine must stay configured.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        # Look for templates inside each installed app.
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# Points at the module holding the callable each server type imports.
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# --- Database ----------------------------------------------------------------

# PostgreSQL is the production source of truth. We fall back to SQLite only when
# POSTGRES_HOST is absent, so a contributor can explore the project without
# installing a database server. Note that `.env` ships with POSTGRES_HOST set,
# so the sqlite3 branch only triggers when `.env` is absent.
if os.getenv("POSTGRES_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB"),
            "USER": os.getenv("POSTGRES_USER"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
            "HOST": os.getenv("POSTGRES_HOST"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }
else:
    # Development-only fallback. Never used in production.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# --- Authentication ----------------------------------------------------------

# Swap Django's default User for our own. This line is why the User, Role, and
# UserRole models live in apps/accounts and why every FK to a user is written
# as "accounts.User".
AUTH_USER_MODEL = "accounts.User"


# Password policy applied on every set_password / create_user. The 12-character
# minimum is stricter than Django's default 8 and is mirrored by the Zod
# schema in the frontend register form.
AUTH_PASSWORD_VALIDATORS = [
    {
        # Rejects passwords that are too similar to the email or name.
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": ("django.contrib.auth.password_validation." "MinimumLengthValidator"),
        "OPTIONS": {"min_length": 12},
    },
    # Rejects passwords found in a leaked-password dictionary.
    {
        "NAME": ("django.contrib.auth.password_validation." "CommonPasswordValidator"),
    },
    # Rejects all-numeric passwords.
    {
        "NAME": ("django.contrib.auth.password_validation." "NumericPasswordValidator"),
    },
]


# --- Internationalisation ----------------------------------------------------

# Default language for server-side messages and the fallback when a request
# sends no usable Accept-Language header.
LANGUAGE_CODE = "en"

# Languages the API can answer in. LocaleMiddleware only activates a locale
# listed here, so the frontend's four languages must appear verbatim.
LANGUAGES = [
    ("en", "English"),
    ("fr", "French"),
    ("rn", "Kirundi"),
    ("sw", "Kiswahili"),
]

# Compiled .mo catalogues live in backend/locale/<code>/LC_MESSAGES/django.mo.
LOCALE_PATHS = [BASE_DIR / "locale"]

# Burundi is the deployment target, so server-rendered timestamps and the
# deadline calculations in the frontend should agree on one local timezone.
TIME_ZONE = "Africa/Bujumbura"

# Activate Django's own translation machinery.
USE_I18N = True

# Store datetimes in UTC in the database and convert on read. Non-negotiable
# for a platform spanning multiple countries.
USE_TZ = True


# --- Static and media files --------------------------------------------------

# Served for CSS/JS/images that ship with the code.
STATIC_URL = "static/"

# Where uploaded documents land in development. In production this should be
# swapped for object storage (django-storages is already in requirements.txt but
# no STORAGES setting is configured yet).
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Confidential documents and generated viewer pages.
# Never expose this directory through a public media/static route.
PRIVATE_DOCUMENT_ROOT = BASE_DIR / "private_documents"

# Use 64-bit primary keys everywhere so a busy platform cannot exhaust int4.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --- CORS --------------------------------------------------------------------

# The Next.js dev server origin. Multiple origins may be comma-separated.
# This is a browser-only control; it grants no protection against direct calls
# to the API from non-browser clients.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:3000",
    ).split(",")
    if origin.strip()
]


# --- Django REST Framework ---------------------------------------------------

REST_FRAMEWORK = {
    # JWT only. Session auth is intentionally not enabled so the API cannot be
    # driven by an ambient browser cookie.
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Safe default for viewsets that do not declare their own permissions:
    # anyone may read, only authenticated users may write.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    # Applied to every viewset: exact-match filters, then free-text search,
    # then ?ordering= support. This is what powers opportunity discovery.
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # Page-number pagination on every list endpoint, 20 rows per page.
    "DEFAULT_PAGINATION_CLASS": ("rest_framework.pagination.PageNumberPagination"),
    "PAGE_SIZE": 20,
    # Rate limits. "auth" is deliberately the tightest because it guards
    # credential endpoints against brute force.
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/day",
        "auth": "5/minute",
        "private_message": "30/minute",
    },
}


# --- JWT (access / refresh tokens) -------------------------------------------

SIMPLE_JWT = {
    # Short-lived access token: the blast radius of a leaked token stays small.
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    # Refresh token lasts a day, forcing re-authentication daily.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    # Record last_login_at on the User model whenever a token pair is issued.
    "UPDATE_LAST_LOGIN": True,
}


# --- Celery / Redis ----------------------------------------------------------

# Redis doubles as the message broker and the result backend. Both point at the
# same instance here; a production setup would normally separate them.
CELERY_BROKER_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)

# Where Celery stores task return values.
CELERY_RESULT_BACKEND = CELERY_BROKER_URL

# a system email configuration so that the user reiceve the verification code
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False

EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")

DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default=EMAIL_HOST_USER,
)

# Set this to the real frontend origin when deployed.
FRONTEND_BASE_URL = config(
    "FRONTEND_BASE_URL",
    default="http://localhost:3000",
)

# Prevent an SMTP connection from waiting indefinitely.
EMAIL_TIMEOUT = 20
# Development-only approval shortcut.
# The approval service must also require DEBUG=True.
PROFESSIONAL_PROFILES_AUTO_APPROVE = DEBUG

# Deadline for responding to a new Expert invitation.
PROJECT_EXPERT_INVITATION_DAYS = 7
# Initial plain-text message limit.
PRIVATE_MESSAGE_MAX_LENGTH = 10000

# --- Protected project reader processing ------------------------------------

PROJECT_CLAMSCAN_EXECUTABLE = os.getenv(
    "PROJECT_CLAMSCAN_EXECUTABLE",
    r"E:\Tools\ClamAV\clamscan.exe",
)

PROJECT_CLAMAV_DATABASE_DIRECTORY = os.getenv(
    "PROJECT_CLAMAV_DATABASE_DIRECTORY",
    r"E:\Tools\ClamAV-data\database",
)

PROJECT_SCAN_TIMEOUT_SECONDS = 180
PROJECT_RENDER_TIMEOUT_SECONDS = 300

PROJECT_PROPOSAL_MAX_BYTES = 20 * 1024 * 1024
PROJECT_READER_MAX_PAGES = 100

# Approximately 144 DPI for a normal PDF page.
PROJECT_READER_RENDER_SCALE = 2.0

# Bound output dimensions and total generated output.
PROJECT_READER_MAX_PAGE_PIXELS = 12_000_000
PROJECT_READER_MAX_TOTAL_PIXELS = 200_000_000
PROJECT_READER_MAX_OUTPUT_BYTES = 200 * 1024 * 1024

# --- Automatic project-content preparation ----------------------------------

CELERY_TASK_ROUTES = {
    "projects.prepare_proposal": {
        "queue": "project_content",
    },
    "projects.enqueue_pending_proposals": {
        "queue": "project_content",
    },
}

CELERY_BEAT_SCHEDULE = {
    "recover-pending-project-proposals": {
        "task": "projects.enqueue_pending_proposals",
        "schedule": 60.0,
        "options": {
            "queue": "project_content",
        },
    },
}

# Keep connection attempts bounded when Redis is unavailable.
CELERY_BROKER_CONNECTION_TIMEOUT = 5

# Receive one task at a time on the development worker.
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Longer than the expected scan + rendering duration.
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "visibility_timeout": 3600,
}
