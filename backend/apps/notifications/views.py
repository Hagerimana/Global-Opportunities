"""Authenticated notification inbox."""

from django.utils import timezone

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(
            recipient_user=self.request.user,
        ).order_by("-created_at", "-pk")

    @action(detail=True, methods=["patch"])
    def read(self, request, pk=None):
        notice = self.get_object()

        # Conditional update preserves the first-read timestamp
        # when concurrent or repeated requests occur.
        Notification.objects.filter(
            pk=notice.pk,
            recipient_user=request.user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=timezone.now(),
        )

        notice.refresh_from_db()

        return Response(NotificationSerializer(notice).data)

    @action(
        detail=False,
        methods=["get"],
        url_path="unread-count",
    )
    def unread_count(self, request):
        count = (
            self.get_queryset()
            .filter(
                is_read=False,
            )
            .count()
        )

        return Response({"count": count})
