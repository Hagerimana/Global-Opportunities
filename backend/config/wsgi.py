"""WSGI entry point, used by traditional synchronous servers (gunicorn, uwsgi).

`application` is the callable a WSGI server invokes for every HTTP request.
Django calls it `application` by convention; renaming it breaks deployment.
"""

import os

from django.core.wsgi import get_wsgi_application

# The server needs to know which settings module to load before it can build
# the application object.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Builds the WSGI handler from ROOT_URLCONF and the middleware stack declared
# in settings.py.
application = get_wsgi_application()
