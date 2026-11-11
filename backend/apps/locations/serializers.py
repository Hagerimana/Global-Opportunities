from rest_framework import serializers

from .models import Country, Province, Commune, Locality


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("code", "name")
        read_only_fields = fields


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ("id", "code", "name", "country_id")
        read_only_fields = fields


class CommuneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commune
        fields = ("id", "code", "name", "province_id")
        read_only_fields = fields


class LocalitySerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = Locality
        fields = (
            "id",
            "name",
            "kind",
            "commune_id",
            "label",
        )
        read_only_fields = fields

    def get_label(self, obj):
        label = f"{obj.name} — {obj.get_kind_display()}"

        if obj.source_zone:
            label += f" ({obj.source_zone})"

        return label
