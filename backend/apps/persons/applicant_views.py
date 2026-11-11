"""Authenticated, self-only applicant information."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AccountType, User
from .models import Person, Interest
from .applicant_serializers import ApplicantProfileSerializer


def require_applicant(account):
    if not (
        account.is_active
        and account.status == User.Status.ACTIVE
        and account.email_verified_at is not None
        and account.account_type == AccountType.PERSONAL
        and account.person_id is not None
    ):
        raise PermissionDenied(
            _("An active verified personal account is required.")
        )


class ApplicantProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _response(self, person, account):
        serializer = ApplicantProfileSerializer(person, context={"account": account})
        response = Response({
            "profile": serializer.data,
            "interest_choices": [
                {"value": value, "label": label}
                for value, label in Interest.choices
            ],
        })
        response["Cache-Control"] = "private, no-store"
        response["Pragma"] = "no-cache"
        return response

    def get(self, request):
        account = get_object_or_404(User, pk=request.user.pk)
        require_applicant(account)
        person = get_object_or_404(
            Person.objects.select_related(
                "residence_province__country",
                "residence_commune",
                "residence_locality",
            ),
            pk=account.person_id,
        )
        return self._response(person, account)

    @transaction.atomic
    def patch(self, request):
        account = get_object_or_404(
            User.objects.select_for_update(), pk=request.user.pk,
        )
        require_applicant(account)
        person = get_object_or_404(
            Person.objects.select_for_update(), pk=account.person_id,
        )
        serializer = ApplicantProfileSerializer(
            person, data=request.data, partial=True,
            context={"account": account},
        )
        serializer.is_valid(raise_exception=True)
        person = serializer.save()
        return self._response(person, account)
