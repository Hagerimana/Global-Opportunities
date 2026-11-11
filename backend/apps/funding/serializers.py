"""Serializers for the financial models.

These are thin on purpose. The financial invariants (approved <= amount,
disbursement totals, payment totals, single payee) live in the models' `clean()`
methods and are additionally re-checked at the database level. A serializer that
duplicated them would be a second place to keep in sync and a chance for the two
to disagree.
"""

from rest_framework import serializers

from .models import Funding, Disbursement, Payment


class FundingSerializer(serializers.ModelSerializer):
    """Converts a Funding award to and from JSON."""

    class Meta:
        model = Funding
        fields = "__all__"
        # The creating user is taken from the request, not the payload.
        read_only_fields = ["created_by_user"]


class DisbursementSerializer(serializers.ModelSerializer):
    """Converts a scheduled instalment to and from JSON."""

    class Meta:
        model = Disbursement
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    """Converts a payment to and from JSON."""

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["created_by_user"]
