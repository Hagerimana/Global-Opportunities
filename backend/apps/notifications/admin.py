"""Read-only inspection of notifications and email delivery."""

from django.contrib import admin

from .models import Notification, NotificationEmailDelivery


class ReadOnlyNotificationAdmin(admin.ModelAdmin):
    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)


@admin.register(Notification)
class NotificationAdmin(ReadOnlyNotificationAdmin):
    list_display = (
        "id",
        "recipient_user",
        "type",
        "title",
        "is_read",
        "created_at",
    )
    list_filter = ("type", "is_read")
    search_fields = ("recipient_user__email", "title")
    list_select_related = ("recipient_user",)


@admin.register(NotificationEmailDelivery)
class NotificationEmailDeliveryAdmin(ReadOnlyNotificationAdmin):
    list_display = (
        "id",
        "notification_id",
        "status",
        "attempts",
        "next_attempt_at",
        "sent_at",
        "last_error_code",
    )
    list_filter = ("status",)
    list_select_related = ("notification",)

    def has_view_permission(self, request, obj=None):
        # Delivery records contain email addresses and message bodies.
        return request.user.is_active and request.user.is_superuser
