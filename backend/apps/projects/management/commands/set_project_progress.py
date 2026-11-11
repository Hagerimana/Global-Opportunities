"""Operator-only project progress updates; never infers funding or activity weights."""
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from apps.projects.models import Project
from apps.projects.public_queries import has_committed_funding


class Command(BaseCommand):
    help = "Record authoritative progress for a posted, funded project."
    def add_arguments(self, parser):
        parser.add_argument("project_id", type=int)
        parser.add_argument("--percent", required=True)
        parser.add_argument("--complete", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            percent = Decimal(options["percent"])
            if not percent.is_finite() or percent < 0 or percent > 100 or percent != percent.quantize(Decimal("0.01")):
                raise ValueError()
        except (InvalidOperation, ValueError):
            raise CommandError("Use a percentage between 0 and 100 with at most two decimal places.")
        if options["complete"] and percent != 100:
            raise CommandError("--complete requires --percent 100.")
        if percent == 100 and not options["complete"]:
            raise CommandError("Use --complete when recording 100% completion.")
        try:
            project = Project.objects.select_for_update().get(pk=options["project_id"])
        except Project.DoesNotExist:
            raise CommandError("Project not found.")
        if project.status in {Project.Status.COMPLETED, Project.Status.CLOSED, Project.Status.CANCELLED, Project.Status.SUSPENDED}:
            raise CommandError("This command does not reopen completed, closed, cancelled or suspended projects.")
        if project.posted_at is None or not has_committed_funding(project):
            raise CommandError("The project must be posted and have a positive approved funding award.")
        project.progress_percentage = percent
        project.status = Project.Status.COMPLETED if options["complete"] else Project.Status.IN_PROGRESS
        if options["complete"]:
            project.completed_at = timezone.now()
        project.full_clean()
        project.save(update_fields=["progress_percentage", "status", "completed_at", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"{project.reference_number}: {percent}% ({project.status})"))
