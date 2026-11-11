from django.apps import AppConfig


class ProposalPreparationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"

    name = "apps.proposal_preparation"
    label = "proposal_preparation"
    verbose_name = "Automatic proposal preparation"

    def ready(self):
        from . import signals  # noqa: F401
