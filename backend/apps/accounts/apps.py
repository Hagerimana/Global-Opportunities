"""Application config for the accounts app.

Declares the app label and the primary-key type so Django does not have to guess.
`default_auto_field` must match the project-wide setting, otherwise Django emits
model warnings and future migrations would renumber primary keys.
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    # Use 64-bit implicit primary keys, consistent with DEFAULT_AUTO_FIELD.
    default_auto_field = "django.db.models.BigAutoField"
    # Dotted path to the app inside the `backend/` project root.
    name = "apps.accounts"
