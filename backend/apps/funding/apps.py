"""Application config for the funding app.

This app owns the whole money chain: an award, its disbursement schedule, and
the payments made against each disbursement. The specification lists these as
Funding, Disbursement, and Payment respectively.
"""

from django.apps import AppConfig


class FundingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.funding"
