"""Staff-only review of reference localities; no automatic bulk verification."""
from django import forms
from django.contrib import admin

from .models import Locality


class LocalityReviewForm(forms.ModelForm):
    class Meta:
        model = Locality
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("is_verified"):
            reference = cleaned.get("source_reference", self.instance.source_reference) or ""
            if "COUNT_MISMATCH" in reference or "ZONE_UNRESOLVED" in reference:
                self.add_error(
                    "is_verified",
                    "This entry belongs to unresolved source data. Resolve the count/zone discrepancy before verification.",
                )
            if not cleaned.get("is_active"):
                self.add_error("is_verified", "Activate the entry before marking it verified.")
        return cleaned


class LocalityReviewAdmin(admin.ModelAdmin):
    form = LocalityReviewForm
    list_display = (
        "name", "kind", "commune", "source_zone", "is_verified", "is_active",
    )
    list_filter = (
        "commune__province", "commune", "kind", "is_verified", "is_active",
    )
    search_fields = ("name", "source_zone", "commune__name")
    list_select_related = ("commune__province",)
    readonly_fields = ("source_reference", "source_page")
    fields = (
        "commune", "name", "kind", "source_zone", "source_reference", "source_page",
        "is_active", "is_verified",
    )


if not admin.site.is_registered(Locality):
    admin.site.register(Locality, LocalityReviewAdmin)
