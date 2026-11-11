"""Routes for the AI assistant, mounted at /api/ai/ by config/urls.py."""

from django.urls import path

from .views import ChatView

urlpatterns = [
    # POST /api/ai/chat/ -- ask a question about platform information.
    path("chat/", ChatView.as_view()),
]
