from django.urls import path

from .views import (
    CountryListView,
    ProvinceListView,
    CommuneListView,
    LocalityListView,
)

urlpatterns = [
    path(
        "countries/",
        CountryListView.as_view(),
        name="location-countries",
    ),
    path(
        "countries/<str:country_code>/provinces/",
        ProvinceListView.as_view(),
        name="location-provinces",
    ),
    path(
        "provinces/<int:province_id>/communes/",
        CommuneListView.as_view(),
        name="location-communes",
    ),
    path(
        "communes/<int:commune_id>/localities/",
        LocalityListView.as_view(),
        name="location-localities",
    ),
]
