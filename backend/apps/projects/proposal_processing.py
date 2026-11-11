"""Explicit processing of privately stored project proposals."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.utils import timezone

from .models import (
    Project,
    ProjectProposalDocument,
    ProjectProposalPage,
)
from .access import proposal_is_reader_ready


class ProposalProcessingError(Exception):
    pass


def _run_scan(source_path):
    executable = Path(settings.PROJECT_CLAMSCAN_EXECUTABLE)
    database = Path(settings.PROJECT_CLAMAV_DATABASE_DIRECTORY)

    if not executable.is_file():
        raise ProposalProcessingError("Scanner executable was not found.")

    if not database.is_dir():
        raise ProposalProcessingError("Scanner database directory was not found.")

    try:
        result = subprocess.run(
            [
                str(executable),
                f"--database={database}",
                "--no-summary",
                "--alert-exceeds-max=yes",
                "--max-filesize=25M",
                "--max-scansize=100M",
                str(source_path),
            ],
            capture_output=True,
            text=True,
            errors="replace",
            timeout=settings.PROJECT_SCAN_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ProposalProcessingError(
            "Scanner timed out; proposal remains blocked."
        ) from exc
    except OSError as exc:
        raise ProposalProcessingError("Scanner could not be started.") from exc

    if result.returncode == 1:
        return ProjectProposalDocument.ScanStatus.INFECTED

    if result.returncode != 0:
        raise ProposalProcessingError(
            "Scanner reported an error; proposal remains blocked."
        )

    return ProjectProposalDocument.ScanStatus.CLEAN


def _render(source_path, output_directory):
    limits = {
        "scale": settings.PROJECT_READER_RENDER_SCALE,
        "max_pages": settings.PROJECT_READER_MAX_PAGES,
        "max_page_pixels": settings.PROJECT_READER_MAX_PAGE_PIXELS,
        "max_total_pixels": settings.PROJECT_READER_MAX_TOTAL_PIXELS,
        "max_output_bytes": settings.PROJECT_READER_MAX_OUTPUT_BYTES,
    }

    worker_path = Path(__file__).with_name("render_worker.py")

    try:
        result = subprocess.run(
            [
                sys.executable,
                str(worker_path),
                str(source_path),
                str(output_directory),
                json.dumps(limits),
            ],
            capture_output=True,
            text=True,
            errors="replace",
            timeout=settings.PROJECT_RENDER_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ProposalProcessingError("Page rendering timed out.") from exc
    except OSError as exc:
        raise ProposalProcessingError("Page renderer could not be started.") from exc

    if result.returncode != 0:
        raise ProposalProcessingError(
            "Page rendering failed. Check the file and rendering limits."
        )

    manifest_path = output_directory / "manifest.json"

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        pages = manifest["pages"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ProposalProcessingError(
            "Renderer did not produce a valid manifest."
        ) from exc

    if not isinstance(pages, list) or not (
        1 <= len(pages) <= settings.PROJECT_READER_MAX_PAGES
    ):
        raise ProposalProcessingError("Invalid rendered page count.")

    for number, page in enumerate(pages, start=1):
        if (
            page.get("page_number") != number
            or not isinstance(page.get("width"), int)
            or not isinstance(page.get("height"), int)
            or page["width"] <= 0
            or page["height"] <= 0
            or page["width"] * page["height"] > settings.PROJECT_READER_MAX_PAGE_PIXELS
            or not (output_directory / f"{number}.png").is_file()
        ):
            raise ProposalProcessingError("Rendered pages are incomplete or invalid.")

    return pages


def process_project_proposal(
    project_id,
    *,
    expected_proposal_id=None,
):
    """
    Process the latest uploaded proposal.

    Intended for an explicit management command during development.
    Holds the project lock until processing completes.
    """

    saved_images = []
    scan_status = ProjectProposalDocument.ScanStatus.ERROR
    proposal_id = None

    try:
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)

            proposal = (
                ProjectProposalDocument.objects.select_for_update()
                .filter(project=project)
                .order_by("-version")
                .first()
            )
            
            if proposal is None:
                raise ProposalProcessingError(
                    "This project has no uploaded proposal."
                )

            # A queued task must never process a newer replacement upload.
            if (
                expected_proposal_id is not None
                and proposal.pk != expected_proposal_id
            ):
                return {
                    "project_id": project.pk,
                    "proposal_id": expected_proposal_id,
                    "page_count": 0,
                    "skipped": True,
                }

            # Duplicate background jobs should not regenerate ready content.
            if (
                expected_proposal_id is not None
                and proposal_is_reader_ready(proposal)
            ):
                return {
                    "project_id": project.pk,
                    "proposal_id": proposal.pk,
                    "page_count": proposal.page_count,
                    "skipped": True,
                }

            proposal_id = proposal.pk

            # Block the proposal before changing its processing status.
            proposal.is_current = False
            proposal.processing_status = (
                ProjectProposalDocument.ProcessingStatus.PROCESSING
            )
            proposal.processing_started_at = timezone.now()
            proposal.processing_error_code = ""
            proposal.save(
                update_fields=[
                    "is_current",
                    "processing_status",
                    "processing_started_at",
                    "processing_error_code",
                    "updated_at",
                ]
            )

            with TemporaryDirectory(prefix="project-proposal-") as temporary:
                temporary = Path(temporary)
                source_path = temporary / "source.pdf"
                output_directory = temporary / "pages"

                digest = hashlib.sha256()
                byte_count = 0

                with proposal.original_file.open("rb") as source:
                    with source_path.open("wb") as destination:
                        while True:
                            chunk = source.read(1024 * 1024)

                            if not chunk:
                                break

                            byte_count += len(chunk)

                            if byte_count > settings.PROJECT_PROPOSAL_MAX_BYTES:
                                raise ProposalProcessingError(
                                    "Proposal exceeds the upload-size limit."
                                )

                            digest.update(chunk)
                            destination.write(chunk)

                if byte_count < 1:
                    raise ProposalProcessingError("The stored proposal is empty.")

                scan_status = _run_scan(source_path)

                if scan_status != ProjectProposalDocument.ScanStatus.CLEAN:
                    raise ProposalProcessingError(
                        "Scanner raised a threat or scan-limit alert. "
                        "The proposal remains blocked."
                    )

                pages = _render(source_path, output_directory)

                # Replace database page records only after successful rendering.
                # Old private files are retained for a later cleanup task.
                proposal.pages.all().delete()

                for metadata in pages:
                    number = metadata["page_number"]

                    page = ProjectProposalPage(
                        proposal=proposal,
                        page_number=number,
                        width=metadata["width"],
                        height=metadata["height"],
                    )

                    image_path = output_directory / f"{number}.png"

                    with image_path.open("rb") as handle:
                        page.image.save(
                            f"page-{number}.png",
                            File(handle),
                            save=False,
                        )

                    saved_images.append((page.image.storage, page.image.name))

                    page.full_clean()
                    page.save()

                # Preserve the one-current-proposal constraint.
                project.proposal_documents.filter(is_current=True).exclude(
                    pk=proposal.pk
                ).update(is_current=False)

                proposal.file_size = byte_count
                proposal.sha256 = digest.hexdigest()
                proposal.page_count = len(pages)
                proposal.scan_status = ProjectProposalDocument.ScanStatus.CLEAN
                proposal.processing_status = (
                    ProjectProposalDocument.ProcessingStatus.READY
                )
                proposal.is_current = True
                proposal.processed_at = timezone.now()
                proposal.processing_error_code = ""

                proposal.full_clean()
                proposal.save(
                    update_fields=[
                        "file_size",
                        "sha256",
                        "page_count",
                        "scan_status",
                        "processing_status",
                        "is_current",
                        "processed_at",
                        "processing_error_code",
                        "updated_at",
                    ]
                )

                return {
                    "project_id": project.pk,
                    "proposal_id": proposal.pk,
                    "page_count": len(pages),
                }

    except Exception as exc:
        for storage, name in saved_images:
            try:
                storage.delete(name)
            except Exception:
                pass

        if proposal_id is not None:
            ProjectProposalDocument.objects.filter(pk=proposal_id).update(
                is_current=False,
                processing_status=(
                    ProjectProposalDocument.ProcessingStatus.REJECTED
                    if scan_status == ProjectProposalDocument.ScanStatus.INFECTED
                    else ProjectProposalDocument.ProcessingStatus.FAILED
                ),
                scan_status=scan_status,
                processing_error_code=(
                    "SCAN_ALERT"
                    if scan_status == ProjectProposalDocument.ScanStatus.INFECTED
                    else "PREPARATION_FAILED"
                ),
                updated_at=timezone.now(),
            )

        if isinstance(exc, ProposalProcessingError):
            raise

        raise ProposalProcessingError(
            "Proposal preparation failed. "
            "Check the stored original, database, and private storage."
        ) from exc
