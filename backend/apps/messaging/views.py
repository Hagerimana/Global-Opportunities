"""Authenticated, participant-scoped private messaging endpoints."""

from django.core.exceptions import (
    ObjectDoesNotExist,
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _, gettext_lazy

from rest_framework import generics, permissions
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.projects.models import ProjectExpertInvitation

from .models import Conversation, ConversationUserState, Message
from .serializers import (
    ConversationInboxStateSerializer,
    ConversationSerializer,
    MarkMessagesReadSerializer,
    MessageSerializer,
    OpenConversationSerializer,
    SendMessageSerializer,
)
from .services import (
    mark_messages_read,
    open_invitation_conversation,
    send_message,
    set_conversation_inbox_state,
)


class ActivePersonalAccount(permissions.BasePermission):
    message = gettext_lazy(
        "An active, email-verified personal account "
        "with a person profile is required."
    )

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.account_type == "PERSONAL"
            and user.person_id is not None
            and user.is_active
            and user.status == "ACTIVE"
            and user.email_verified_at is not None
        )


def participant_conversations(user):
    """The common ownership boundary for conversation endpoints."""

    return (
        Conversation.objects.filter(Q(owner_user=user) | Q(expert_user=user))
        .select_related(
            "invitation__project",
            "owner_user__person",
            "expert_user__person",
        )
        .prefetch_related(
            Prefetch(
                "user_states",
                queryset=ConversationUserState.objects.filter(
                    user=user,
                ),
                to_attr="viewer_states",
            )
        )
        .annotate(
            unread_count=Count(
                "messages",
                filter=Q(
                    messages__recipient_user=user,
                    messages__read_at__isnull=True,
                ),
                distinct=True,
            )
        )
        .order_by("-updated_at", "-pk")
    )


def owned_conversation(user, conversation_id):
    return get_object_or_404(
        participant_conversations(user),
        pk=conversation_id,
    )


def call_messaging_service(service, **kwargs):
    """Translate service failures without exposing private objects."""

    try:
        return service(**kwargs)

    except ObjectDoesNotExist as error:
        raise NotFound(
            _(
                "The requested conversation, invitation, or message "
                "was not found."
            )
        ) from error

    except DjangoPermissionDenied as error:
        raise PermissionDenied(str(error)) from error

    except DjangoValidationError as error:
        detail = (
            error.message_dict
            if hasattr(error, "message_dict")
            else {"non_field_errors": error.messages}
        )

        raise ValidationError(detail) from error

    except IntegrityError as error:
        raise ValidationError(
            {
                "non_field_errors": (
                    _(
                        "The operation conflicted with another change. "
                        "Refresh and try again."
                    )
                )
            }
        ) from error


class ConversationListView(generics.ListAPIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = ConversationSerializer

    def get_queryset(self):
        queryset = participant_conversations(self.request.user)

        folder = self.request.query_params.get("folder", "inbox")

        if folder not in {"inbox", "archived", "hidden", "all"}:
            raise ValidationError(
                {"folder": _("Choose inbox, archived, hidden, or all.")}
            )

        if folder == "all":
            return queryset

        filters = {
            "user_states__user": self.request.user,
        }

        if folder == "inbox":
            filters.update(
                {
                    "user_states__hidden_at__isnull": True,
                    "user_states__archived_at__isnull": True,
                }
            )

        elif folder == "archived":
            filters.update(
                {
                    "user_states__hidden_at__isnull": True,
                    "user_states__archived_at__isnull": False,
                }
            )

        else:
            filters["user_states__hidden_at__isnull"] = False

        return queryset.filter(**filters)


class OpenConversationView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    def post(self, request):
        serializer = OpenConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation_id = serializer.validated_data["invitation_id"]

        # An unrelated account receives 404 rather than invitation details.
        get_object_or_404(
            ProjectExpertInvitation.objects.filter(
                Q(invited_by_user=request.user) | Q(expert_user=request.user)
            ),
            pk=invitation_id,
        )

        conversation = call_messaging_service(
            open_invitation_conversation,
            user=request.user,
            invitation_id=invitation_id,
        )

        conversation = owned_conversation(
            request.user,
            conversation.pk,
        )

        return Response(
            ConversationSerializer(
                conversation,
                context={"request": request},
            ).data
        )


class ConversationDetailView(generics.RetrieveAPIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = ConversationSerializer

    def get_queryset(self):
        return participant_conversations(self.request.user)


class ConversationMessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    serializer_class = MessageSerializer

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "private_message"

    def get_throttles(self):
        # Reading the timeline should not consume the send allowance.
        if self.request.method != "POST":
            return []

        return super().get_throttles()

    def get_queryset(self):
        conversation = owned_conversation(
            self.request.user,
            self.kwargs["pk"],
        )

        # Newest first so the first page contains the latest messages.
        return Message.objects.filter(
            conversation=conversation,
        ).order_by("-sent_at", "-pk")

    def create(self, request, *args, **kwargs):
        conversation = owned_conversation(
            request.user,
            self.kwargs["pk"],
        )

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = call_messaging_service(
            send_message,
            user=request.user,
            conversation_id=conversation.pk,
            **serializer.validated_data,
        )

        # The same successful response is appropriate for a retry
        # that returns a message already saved by the service.
        return Response(
            MessageSerializer(
                message,
                context={"request": request},
            ).data
        )


class MarkConversationMessagesReadView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    def post(self, request, pk):
        owned_conversation(request.user, pk)

        serializer = MarkMessagesReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = call_messaging_service(
            mark_messages_read,
            user=request.user,
            conversation_id=pk,
            **serializer.validated_data,
        )

        return Response({"marked_read": updated})


class ConversationInboxStateView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        ActivePersonalAccount,
    ]

    def patch(self, request, pk):
        owned_conversation(request.user, pk)

        serializer = ConversationInboxStateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        call_messaging_service(
            set_conversation_inbox_state,
            user=request.user,
            conversation_id=pk,
            **serializer.validated_data,
        )

        conversation = owned_conversation(request.user, pk)

        return Response(
            ConversationSerializer(
                conversation,
                context={"request": request},
            ).data
        )
