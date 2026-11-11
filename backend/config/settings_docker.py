"""Local Docker demonstration only; not the final Railway settings."""
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from .settings import *  # noqa: F403,F401

if os.environ.get("DOCKER_DEMO_ONLY") != "true":
    raise ImproperlyConfigured("This settings module is for the local Docker demo only.")
if not os.environ.get("POSTGRES_HOST"):
    raise ImproperlyConfigured("POSTGRES_HOST is required; SQLite fallback is disabled.")
if not os.environ.get("REDIS_URL"):
    raise ImproperlyConfigured("REDIS_URL is required.")
if SECRET_KEY == "unsafe-development-key" or len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("Set a generated DJANGO_SECRET_KEY of at least 50 characters.")

DEBUG = False
STATIC_URL = "/static/"
STATIC_ROOT = Path("/data/static")
MEDIA_URL = "/media/"
MEDIA_ROOT = Path("/data/media")
PRIVATE_DOCUMENT_ROOT = Path("/data/private")
MIDDLEWARE = list(MIDDLEWARE)
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
PROJECT_CLAMSCAN_EXECUTABLE = "/usr/bin/clamscan"
PROJECT_CLAMAV_DATABASE_DIRECTORY = "/data/clamav"

# Use the same Gmail SMTP service as the working Windows configuration.
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False

EMAIL_HOST_USER = os.environ["EMAIL_HOST_USER"]
EMAIL_HOST_PASSWORD = os.environ["EMAIL_HOST_PASSWORD"]
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)
EMAIL_TIMEOUT = 30.0

# The local Docker demonstration has no human document-review workflow yet.
# Keep the explicit development-only activation available (the same
# "Activate development profile" action local DEBUG runs provide) so
# fictitious demo accounts can complete Expert activation, appear in the
# Expert directory, and receive project invitations. This module refuses
# to load outside the DOCKER_DEMO_ONLY demonstration.
PROFESSIONAL_PROFILES_AUTO_APPROVE = True
PROFESSIONAL_PROFILES_DEVELOPMENT_APPROVAL = True
SECURE_SSL_REDIRECT = False  # loopback-only HTTP demonstration
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_TRUSTED_ORIGINS = ["http://localhost:13000", "http://127.0.0.1:13000", "http://localhost:18000", "http://127.0.0.1:18000"]
LOGGING = {
    "version": 1, "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
