"""Private conversation routes, mounted at /api/messaging/."""

from django.urls import path

from .views import (
    ConversationDetailView,
    ConversationInboxStateView,
    ConversationListView,
    ConversationMessageListCreateView,
    MarkConversationMessagesReadView,
    OpenConversationView,
)

urlpatterns = [
    path(
        "conversations/",
        ConversationListView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/open/",
        OpenConversationView.as_view(),
        name="conversation-open",
    ),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "conversations/<int:pk>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="conversation-messages",
    ),
    path(
        "conversations/<int:pk>/read/",
        MarkConversationMessagesReadView.as_view(),
        name="conversation-read",
    ),
    path(
        "conversations/<int:pk>/inbox-state/",
        ConversationInboxStateView.as_view(),
        name="conversation-inbox-state",
    ),
]
