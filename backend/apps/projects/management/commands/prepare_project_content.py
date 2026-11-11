"""Scan and render an existing project's latest uploaded proposal."""

from django.core.management.base import BaseCommand, CommandError

from apps.projects.models import Project
from apps.projects.proposal_processing import (
    ProposalProcessingError,
    process_project_proposal,
)


class Command(BaseCommand):
    help = "Scan the latest project proposal and prepare private reader images."

    def add_arguments(self, parser):
        parser.add_argument(
            "project_id",
            type=int,
            help="Numeric project ID.",
        )

    def handle(self, *args, **options):
        try:
            result = process_project_proposal(options["project_id"])
        except Project.DoesNotExist as exc:
            raise CommandError("Project not found.") from exc
        except ProposalProcessingError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Project {result['project_id']} prepared: "
                f"{result['page_count']} private reader page(s)."
            )
        )
