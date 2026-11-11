from django.contrib import admin

from .models import PendingRegistration, Role, User, UserRole


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "code_expires_at",
        "failed_attempts",
        "created_at",
    )
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-created_at",)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "status",
        "email_verified_at",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = (
        "status",
        "is_staff",
        "is_active",
    )
    search_fields = ("email",)
    ordering = ("-created_at",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "role",
        "assigned_by",
        "assigned_at",
    )
    search_fields = (
        "user__email",
        "role__code",
        "role__name",
    )
