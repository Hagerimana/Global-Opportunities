"""Application config for the persons app.

The persons app is listed first among our domain apps because accounts.User
holds a ForeignKey to Person, so Person must be importable when the accounts app
is loaded.
"""

from django.apps import AppConfig


class PersonsConfig(AppConfig):
    # 64-bit implicit primary keys, matching DEFAULT_AUTO_FIELD.
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.persons"
