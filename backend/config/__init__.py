"""Project package for the `config` Django project.

Importing this package has one side effect, and it is deliberate: it pulls in
the Celery application so that `@shared_task` decorators and `.delay()` calls
resolve against a configured app instance.

Django imports `config.settings`, which means this file runs first during
startup. That guarantees the Celery app exists before any app module tries to
register a task.
"""

# Bind the Celery instance to the standard name `celery_app`. The Celery docs
# require this exact attribute name for autodiscovery to kick in.
from .celery import app as celery_app

# Re-exported so `from config import celery_app` works for WSGI/ASGI servers
# that expect to find the app on the project package.
__all__ = ("celery_app",)
