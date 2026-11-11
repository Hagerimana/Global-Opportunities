"""In-platform notifications and durable email delivery jobs."""

import uuid

from django.db import models
from django.utils import timezone


class Notification(models.Model):
    """One system-generated alert addressed to one account."""

    class Type(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        APPLICATION = "APPLICATION", "Application"
        AID = "AID", "Aid"
        PROJECT = "PROJECT", "Project"
        FUNDING = "FUNDING", "Funding"
        DISBURSEMENT = "DISBURSEMENT", "Disbursement"
        PAYMENT = "PAYMENT", "Payment"
        MENTORSHIP = "MENTORSHIP", "Mentorship"
        EXPERTISE = "EXPERTISE", "Expertise"
        TRAINING = "TRAINING", "Training"
        OPPORTUNITY = "OPPORTUNITY", "Opportunity"
        INVITATION = "INVITATION", "Invitation"
        DOCUMENT = "DOCUMENT", "Document"
        REPORT = "REPORT", "Report"
        EVALUATION = "EVALUATION", "Evaluation"
        AUDIT = "AUDIT", "Audit"
        PUBLICATION = "PUBLICATION", "Publication"
        MESSAGE = "MESSAGE", "Message"
        JOB_APPLICATION = "JOB_APPLICATION", "Job application"
        RECRUITMENT = "RECRUITMENT", "Recruitment"
        DEADLINE = "DEADLINE", "Deadline"
        OTHER = "OTHER", "Other"

    class TargetType(models.TextChoices):
        PROJECT = "PROJECT", "Project"
        EXPERT_INVITATION = "EXPERT_INVITATION", "Expert invitation"
        CONVERSATION = "CONVERSATION", "Conversation"

    recipient_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    type = models.CharField(
        max_length=30,
        choices=Type.choices,
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    # A navigation reference, not an authorization grant.
    target_type = models.CharField(
        max_length=30,
        choices=TargetType.choices,
        blank=True,
    )
    target_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    # Used by backend services to avoid duplicate notifications
    # for the same event and recipient.
    event_key = models.CharField(
        max_length=200,
        unique=True,
        null=True,
        blank=True,
        editable=False,
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(
                fields=["recipient_user", "is_read", "created_at"],
                name="notice_recipient_read_idx",
            ),
        ]


class NotificationEmailDelivery(models.Model):
    """An email alert waiting for delivery or recording its outcome."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Queued"
        SENDING = "SENDING", "Being sent"
        SENT = "SENT", "Accepted by email backend"
        FAILED = "FAILED", "Failed; waiting for retry"
        CANCELLED = "CANCELLED", "Cancelled"

    notification = models.OneToOneField(
        Notification,
        on_delete=models.CASCADE,
        related_name="email_delivery",
    )

    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    attempts = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)

    # A worker claims a job for a limited period.
    claim_id = models.UUIDField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)

    # Stable internal identifier. It is not a public access token.
    delivery_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    # Store a controlled error category, not SMTP credentials
    # or a complete raw exception.
    last_error_code = models.CharField(max_length=100, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "pk"]
        indexes = [
            models.Index(
                fields=["status", "next_attempt_at"],
                name="notice_email_queue_idx",
            ),
        ]
