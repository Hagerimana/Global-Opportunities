"""Production settings for the Railway backend service.

Selected with DJANGO_SETTINGS_MODULE=config.settings_railway. Unlike
settings_docker, nothing here relaxes security: HTTPS redirect and secure
cookies stay on, and the development approval shortcuts stay off.
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403,F401

if not os.environ.get("POSTGRES_HOST"):
    raise ImproperlyConfigured("POSTGRES_HOST is required.")
if not os.environ.get("REDIS_URL"):
    raise ImproperlyConfigured("REDIS_URL is required.")
if SECRET_KEY == "unsafe-development-key" or len(SECRET_KEY) < 50:  # noqa: F405
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY to a generated value of 50+ characters.")

DEBUG = False

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data"))
STATIC_URL = "/static/"
STATIC_ROOT = DATA_ROOT / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = DATA_ROOT / "media"
PRIVATE_DOCUMENT_ROOT = DATA_ROOT / "private"

MIDDLEWARE = list(MIDDLEWARE)  # noqa: F405
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

PROJECT_CLAMSCAN_EXECUTABLE = "/usr/bin/clamscan"
PROJECT_CLAMAV_DATABASE_DIRECTORY = str(DATA_ROOT / "clamav")

# Railway terminates TLS at its proxy and forwards X-Forwarded-Proto.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if o.strip()
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
