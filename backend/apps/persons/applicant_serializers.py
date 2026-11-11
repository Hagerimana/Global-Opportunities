"""Private applicant serializer; never reuse for public project responses."""
from collections.abc import Mapping
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework import serializers

from apps.locations.models import Country, Province, Commune, Locality
from .models import Person, Interest
from .applicant_services import personal_information_issues
from .validators import validate_minimum_age

class ApplicantProfileSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    completion = serializers.SerializerMethodField()
    province_id = serializers.PrimaryKeyRelatedField(
        source="residence_province",
        queryset=Province.objects.filter(is_active=True, country__is_active=True),
        required=False, allow_null=True,
    )
    commune_id = serializers.PrimaryKeyRelatedField(
        source="residence_commune",
        queryset=Commune.objects.filter(
            is_active=True, province__is_active=True,
            province__country__is_active=True,
        ),
        required=False, allow_null=True,
    )
    locality_id = serializers.PrimaryKeyRelatedField(
        source="residence_locality",
        queryset=Locality.objects.filter(
            is_active=True, is_verified=True, commune__is_active=True,
            commune__province__is_active=True,
            commune__province__country__is_active=True,
        ),
        required=False, allow_null=True,
    )
    interests = serializers.ListField(
        child=serializers.ChoiceField(choices=Interest.choices),
        required=False, allow_empty=True,
    )

    class Meta:
        model = Person
        fields = (
            "id", "first_name", "last_name", "email", "date_of_birth",
            "gender", "phone", "nationality", "country_of_residence",
            "address", "province_id", "commune_id", "locality_id",
            "province", "commune", "colline", "bank_name",
            "bank_account_number", "interests", "completion",
        )
        read_only_fields = (
            "id", "province", "commune", "colline",
        )

    def get_email(self, obj):
        return self.context["account"].email

    def get_completion(self, obj):
        issues = personal_information_issues(obj, self.context["account"])
        return {
            "is_complete": not bool(issues),
            "missing_or_invalid_fields": list(issues),
            "issues": issues,
        }

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            writable = {
                name for name, field in self.fields.items()
                if not field.read_only
            }
            unexpected = set(data) - writable
            if unexpected:
                raise serializers.ValidationError({
                    name: _("This field cannot be changed through this endpoint.")
                    for name in sorted(unexpected)
                })
        return super().to_internal_value(data)

    def validate_date_of_birth(self, value):
        try:
            validate_minimum_age(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc

        return value

    def validate_interests(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                _("Do not select duplicate interests.")
            )
        return value

    def _country_code(self, value):
        code = value.strip().upper()
        if code and not Country.objects.filter(code=code, is_active=True).exists():
            raise serializers.ValidationError(
                _("Select a country from the catalogue.")
            )
        return code

    def validate_nationality(self, value):
        return self._country_code(value)

    def validate_country_of_residence(self, value):
        return self._country_code(value)

    def validate(self, attrs):
        person = self.instance
        country = attrs.get("country_of_residence", person.country_of_residence)
        province_key = "residence_province"
        commune_key = "residence_commune"
        locality_key = "residence_locality"
        changed_country = (
            "country_of_residence" in attrs
            and country != person.country_of_residence
        )

        if changed_country:
            for key in (province_key, commune_key, locality_key):
                attrs.setdefault(key, None)

        if country != "BI":
            if any(attrs.get(key) is not None for key in (
                province_key, commune_key, locality_key,
            )):
                raise serializers.ValidationError({
                    "country_of_residence": _(
                        "Burundi selectors require residence country BI."
                    )
                })
            if changed_country:
                attrs.update(province="", commune="", colline="")
            return attrs

        province = attrs.get(province_key, person.residence_province)
        if province_key in attrs and (
            getattr(province, "pk", None) != person.residence_province_id
        ):
            attrs.setdefault(commune_key, None)
            attrs.setdefault(locality_key, None)

        commune = attrs.get(commune_key, person.residence_commune)
        if commune_key in attrs and (
            getattr(commune, "pk", None) != person.residence_commune_id
        ):
            attrs.setdefault(locality_key, None)

        locality = attrs.get(locality_key, person.residence_locality)
        errors = {}
        if province and not (
            province.is_active and province.country_id == "BI"
            and province.country.is_active
        ):
            errors["province_id"] = _("Select an active Burundi province.")
        if commune and not (
            commune.is_active and province and commune.province_id == province.pk
        ):
            errors["commune_id"] = _(
                "The commune must belong to the selected province."
            )
        if locality and not (
            locality.is_active and locality.is_verified and commune
            and locality.commune_id == commune.pk
        ):
            errors["locality_id"] = _(
                "Select a verified locality in the selected commune."
            )
        if errors:
            raise serializers.ValidationError(errors)

        if any(key in attrs for key in (province_key, commune_key, locality_key)):
            attrs["province"] = province.name if province else ""
            attrs["commune"] = commune.name if commune else ""
            attrs["colline"] = locality.name if locality else ""
        return attrs

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise serializers.ValidationError(detail)
        instance.save()
        return instance
    
    def validate_first_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(_("Enter your first name."))

        return value

    def validate_last_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(_("Enter your last name."))

        return value
