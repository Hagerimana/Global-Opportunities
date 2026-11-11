"""Application configuration for professional profiles."""

from django.apps import AppConfig


class ProfessionalProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.professional_profiles"
    verbose_name = "Professional profiles"
