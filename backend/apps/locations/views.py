"""Public, read-only form reference endpoints."""

from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions

from .models import Country, Province, Commune, Locality
from .serializers import (
    CountrySerializer,
    ProvinceSerializer,
    CommuneSerializer,
    LocalitySerializer,
)


class ReferenceListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    pagination_class = None


class CountryListView(ReferenceListView):
    serializer_class = CountrySerializer

    def get_queryset(self):
        return Country.objects.filter(is_active=True).order_by("name")


class ProvinceListView(ReferenceListView):
    serializer_class = ProvinceSerializer

    def get_queryset(self):
        country = get_object_or_404(
            Country,
            code=self.kwargs["country_code"].upper(),
            is_active=True,
        )

        return Province.objects.filter(
            country=country,
            is_active=True,
        ).order_by("name")


class CommuneListView(ReferenceListView):
    serializer_class = CommuneSerializer

    def get_queryset(self):
        province = get_object_or_404(
            Province,
            pk=self.kwargs["province_id"],
            is_active=True,
            country__is_active=True,
        )

        return Commune.objects.filter(
            province=province,
            is_active=True,
        ).order_by("name")


class LocalityListView(ReferenceListView):
    serializer_class = LocalitySerializer

    def get_queryset(self):
        commune = get_object_or_404(
            Commune,
            pk=self.kwargs["commune_id"],
            is_active=True,
            province__is_active=True,
            province__country__is_active=True,
        )

        return Locality.objects.filter(
            commune=commune,
            is_active=True,
            is_verified=True,
        ).order_by("name", "source_zone", "pk")
