#!/usr/bin/env python
"""Django's command-line utility for administrative tasks.

This is the entry point every `python manage.py ...` command goes through
(check, makemigrations, migrate, runserver, createsuperuser).

It does exactly one thing: pin DJANGO_SETTINGS_MODULE to our project settings
and hand control to Django's command dispatcher. Nothing else belongs here.
"""

import os
import sys

# Only run the dispatcher when this file is executed directly (not when it is
# imported by wsgi.py/asgi.py or by a test runner).
if __name__ == "__main__":
    # `setdefault` means a pre-existing environment variable wins, which lets
    # deployment tooling (e.g. gunicorn, pytest-django) override the settings
    # module without editing this file.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    # Imported here rather than at module level so that `--help` works even if
    # the settings module has an import error.
    from django.core.management import execute_from_command_line

    # `sys.argv` carries the command name plus any flags, e.g.
    # `["manage.py", "migrate", "--noinput"]`.
    execute_from_command_line(sys.argv)
