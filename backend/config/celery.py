"""Celery application wiring for asynchronous / background work.

The spec requires Celery + Redis for anything that must not block an HTTP
request: sending notification emails, deadline reminders, document virus
scanning, and the AI Assistant's grounded retrieval.

Run a worker alongside the web server:
    celery -A config worker -l info
"""

import os

from celery import Celery

# Celery needs the Django settings module to resolve `config_from_object`.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# `global_opportunities` is the Celery app name; it prefixes every task id and
# every queue name, so keep it stable across environments.
app = Celery("global_opportunities")

# Pull Celery config out of Django settings, but only the namespaced keys
# (CELERY_BROKER_URL, CELERY_RESULT_BACKEND, ...). This avoids duplicating
# infrastructure config in two places.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Scan every installed app for a `tasks.py` module and register whatever it
# finds. Apps without a tasks.py are simply skipped.
app.autodiscover_tasks()
