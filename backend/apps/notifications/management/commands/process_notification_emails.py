"""Send queued notification emails with retry and claim recovery."""

import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections, transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.models import NotificationEmailDelivery


def claim_next_email():
    """Claim one due job without holding a lock during SMTP."""

    now = timezone.now()

    eligible = Q(
        status__in=["PENDING", "FAILED"],
        next_attempt_at__lte=now,
    ) | Q(
        status="SENDING",
        locked_until__lte=now,
    )

    with transaction.atomic():
        job = (
            NotificationEmailDelivery.objects.select_for_update(
                skip_locked=True,
            )
            .filter(eligible)
            .order_by("next_attempt_at", "pk")
            .first()
        )

        if job is None:
            return None

        job.status = NotificationEmailDelivery.Status.SENDING
        job.claim_id = uuid.uuid4()
        job.locked_until = now + timedelta(minutes=10)
        job.attempts += 1

        job.save(
            update_fields=[
                "status",
                "claim_id",
                "locked_until",
                "attempts",
                "updated_at",
            ]
        )

        return job


def complete_job(job, **changes):
    """Only the worker holding the current claim may finalize it."""

    return NotificationEmailDelivery.objects.filter(
        pk=job.pk,
        claim_id=job.claim_id,
        status=NotificationEmailDelivery.Status.SENDING,
    ).update(
        **changes,
        claim_id=None,
        locked_until=None,
        updated_at=timezone.now(),
    )


def deliver_email(job):
    """Attempt delivery; temporary failures remain available for retry."""

    # Avoid sending a queued alert to an address that is no longer
    # the recipient account's email.
    current_recipient = (
        User.objects.filter(
            notifications__pk=job.notification_id,
        )
        .values(
            "email",
            "is_active",
            "status",
        )
        .first()
    )

    if (
        current_recipient is None
        or not current_recipient["is_active"]
        or current_recipient["status"] != User.Status.ACTIVE
        or current_recipient["email"].lower() != job.recipient_email.lower()
    ):
        complete_job(
            job,
            status=NotificationEmailDelivery.Status.CANCELLED,
            last_error_code="RECIPIENT_CHANGED_OR_INACTIVE",
        )
        return "cancelled"

    try:
        sent_count = send_mail(
            subject=job.subject,
            message=job.body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[job.recipient_email],
            fail_silently=False,
        )

        if sent_count != 1:
            raise RuntimeError("EMAIL_BACKEND_ACCEPTED_ZERO")

    except Exception as error:
        # Retry with a bounded delay. This command intentionally
        # does not print addresses, email bodies, or raw exceptions.
        delay_minutes = min(60, 2 ** min(job.attempts, 6))

        complete_job(
            job,
            status=NotificationEmailDelivery.Status.FAILED,
            next_attempt_at=(timezone.now() + timedelta(minutes=delay_minutes)),
            last_error_code=type(error).__name__[:100],
        )

        return "failed"

    complete_job(
        job,
        status=NotificationEmailDelivery.Status.SENT,
        sent_at=timezone.now(),
        last_error_code="",
    )

    return "sent"


class Command(BaseCommand):
    help = "Send queued notification emails, optionally polling continuously."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=20,
            help="Maximum jobs processed per polling pass.",
        )
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Keep polling until stopped.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=10,
            help="Seconds between polling passes in watch mode.",
        )

    def handle(self, *args, **options):
        if options["limit"] < 1 or options["interval"] < 1:
            raise CommandError("--limit and --interval must be positive.")

        try:
            while True:
                close_old_connections()

                counts = {
                    "sent": 0,
                    "failed": 0,
                    "cancelled": 0,
                }

                for _ in range(options["limit"]):
                    job = claim_next_email()

                    if job is None:
                        break

                    result = deliver_email(job)
                    counts[result] += 1

                processed = sum(counts.values())

                if processed or not options["watch"]:
                    self.stdout.write(
                        f"Processed {processed}: "
                        f"{counts['sent']} sent, "
                        f"{counts['failed']} failed, "
                        f"{counts['cancelled']} cancelled."
                    )

                if not options["watch"]:
                    break

                time.sleep(options["interval"])

        except KeyboardInterrupt:
            self.stdout.write("Notification email worker stopped.")
