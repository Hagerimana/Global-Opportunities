"""ASGI entry point, used by async servers (uvicorn, daphne, Hypercorn).

Kept separate from wsgi.py so the project can serve both sync and async
workloads. Channels (WebSockets) would be wired in here if the platform ever
needs real-time notification delivery.
"""

import os

from django.core.asgi import get_asgi_application

# Same contract as wsgi.py: declare the settings module before building the app.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# The callable an ASGI server awaits, scoped as `{"type": "http", ...}` per
# request.
application = get_asgi_application()
