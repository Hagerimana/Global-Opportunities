"""Check and repair proposal preparation for existing draft projects."""

from django.core.management.base import BaseCommand, CommandError

from apps.projects.access import proposal_is_reader_ready
from apps.projects.models import Project, ProjectProposalDocument
from apps.projects.proposal_processing import process_project_proposal


class Command(BaseCommand):
    help = (
        "Check draft proposals and optionally reprocess proposals "
        "that are not ready for protected reading."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Perform repairs. Without this option, only report problems.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]

        project_ids = list(
            Project.objects.filter(status=Project.Status.DRAFT)
            .order_by("pk")
            .values_list("pk", flat=True)
        )

        counts = {
            "checked": 0,
            "already_ready": 0,
            "needs_repair": 0,
            "repaired": 0,
            "failed": 0,
            "blocked": 0,
            "missing": 0,
            "processing": 0,
        }

        self.stdout.write(
            "Mode: "
            + (
                "REPAIR - proposals will be scanned and rendered."
                if apply_changes
                else "CHECK ONLY - no data will be changed."
            )
        )

        self.stdout.write(f"Draft projects found: {len(project_ids)}")

        for project_id in project_ids:
            project = Project.objects.filter(
                pk=project_id,
                status=Project.Status.DRAFT,
            ).first()

            if project is None:
                continue

            counts["checked"] += 1

            proposal = (
                ProjectProposalDocument.objects.filter(project_id=project_id)
                .order_by("-version")
                .first()
            )

            label = f"Project {project.pk} " f"({project.reference_number})"

            if proposal is None:
                counts["missing"] += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"{label}: NO PROPOSAL. "
                        "There is no stored proposal to repair."
                    )
                )
                continue

            if (
                proposal.scan_status == ProjectProposalDocument.ScanStatus.INFECTED
                or proposal.processing_status
                == ProjectProposalDocument.ProcessingStatus.REJECTED
            ):
                counts["blocked"] += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"{label}: BLOCKED. "
                        "Rejected or threat-flagged proposals "
                        "are not automatically reprocessed."
                    )
                )
                continue

            if proposal_is_reader_ready(proposal):
                counts["already_ready"] += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{label}: ALREADY READY. "
                        f"{proposal.page_count} prepared page(s)."
                    )
                )
                continue

            if (
                proposal.processing_status
                == ProjectProposalDocument.ProcessingStatus.PROCESSING
            ):
                counts["processing"] += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"{label}: PROCESSING. "
                        "Skipped to avoid competing with an active job. "
                        "Investigate separately if this state is stale."
                    )
                )
                continue

            counts["needs_repair"] += 1

            self.stdout.write(
                f"{label}: NEEDS REPAIR. "
                f"proposal={proposal.pk}, "
                f"processing={proposal.processing_status}, "
                f"scan={proposal.scan_status}, "
                f"current={proposal.is_current}, "
                f"stored_pages={proposal.pages.count()}, "
                f"expected_pages={proposal.page_count}."
            )

            if not apply_changes:
                continue

            try:
                result = process_project_proposal(
                    project_id,
                    expected_proposal_id=proposal.pk,
                )

                if result.get("skipped"):
                    counts["failed"] += 1
                    self.stderr.write(
                        self.style.WARNING(
                            f"{label}: NOT REPAIRED IN THIS RUN. "
                            "Processing was skipped, possibly because "
                            "the latest proposal changed. Run the check again."
                        )
                    )
                    continue

                proposal.refresh_from_db()

                if not proposal_is_reader_ready(proposal):
                    raise RuntimeError(
                        "Processing returned without producing "
                        "a reader-ready proposal."
                    )

                counts["repaired"] += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"{label}: REPAIRED SUCCESSFULLY. "
                        f"Scan CLEAN; {proposal.page_count} "
                        "reader page(s) prepared."
                    )
                )

            except Exception as exc:
                counts["failed"] += 1

                self.stderr.write(
                    self.style.ERROR(
                        f"{label}: REPAIR FAILED. " f"{type(exc).__name__}: {exc}"
                    )
                )

                if exc.__cause__ is not None:
                    self.stderr.write(f"Underlying cause: {exc.__cause__}")

        self.stdout.write("")
        self.stdout.write("SUMMARY")

        for key, value in counts.items():
            self.stdout.write(f"  {key.replace('_', ' ').capitalize()}: {value}")

        if not apply_changes:
            self.stdout.write(
                "\nNo changes were made. "
                "Run with --apply to repair eligible proposals."
            )
        elif counts["failed"]:
            raise CommandError(
                "Some proposal repairs failed. "
                "Read the project-specific messages above."
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "\nRepair run completed. "
                    "Review any missing, blocked, or processing projects "
                    "listed above. Projects were not automatically posted."
                )
            )
