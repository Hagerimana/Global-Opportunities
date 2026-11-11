"""The AI Assistant endpoint.

IMPORTANT SCOPE NOTE. This is a placeholder, not an assistant. It validates the
request and returns a fixed message describing the assistant's limits. It does
not call any model, does not read any Opportunity, CallForProjects, or Document
row, and therefore cannot yet satisfy the specification's requirements that
answers be grounded in official platform data and that the assistant never
fabricate amounts, deadlines, or eligibility rules.

The behaviour that is correct today is the refusal to guess: the reply explicitly
declines to make eligibility, selection, or funding decisions, and points the
user at the official detail pages instead. That boundary should be preserved
when a real retrieval step is added.
"""

from django.utils.translation import gettext as _
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class ChatView(APIView):
    """POST /api/ai/chat/ -- ask the assistant a question.

    Requires authentication: the assistant will eventually need the caller's
    roles and project context to give a useful answer, and an unauthenticated
    endpoint would be an open, unmetered resource.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Accept a question and return the assistant's stated capability.

        Only `message` is read. `str(...)` guards against a client sending a
        nested object or a number for this key, and `.strip()` collapses
        whitespace so a blank submission is detected.
        """
        question = str(request.data.get("message", "")).strip()

        if not question:
            return Response(
                {"message": _("Please enter a question.")}, status=400
            )

        return Response(
            {
                "message": _(
                    "I can explain official opportunity details, eligibility "
                    "criteria, documents, deadlines, and application steps. I "
                    "cannot make final eligibility, selection, or funding "
                    "decisions."
                ),
                # Tells the client where the authoritative data lives, so the
                # user is directed to the record rather than to the model.
                "grounding": _(
                    "Use an opportunity or call detail page to inspect official "
                    "information."
                ),
            }
        )
