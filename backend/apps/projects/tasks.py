"""Commit-safe dispatch and bounded, automatic proposal recovery."""
import logging
from datetime import timedelta
from functools import partial

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.db.models import F, OuterRef, Q, Subquery
from django.utils import timezone

from .access import proposal_is_reader_ready
from .models import Project, ProjectProposalDocument
from .proposal_processing import process_project_proposal

logger = logging.getLogger(__name__)
PREPARE_TASK_NAME = "projects.prepare_proposal"
RECOVERY_TASK_NAME = "projects.enqueue_pending_proposals"
CONTENT_QUEUE = "project_content"
MAX_ATTEMPTS = 3
RETRY_SECONDS = 120
RETRY_CODES = ("PREPARATION_FAILED", "AUTO_FAILED_1", "AUTO_FAILED_2")
STOP_CODE = "AUTO_FAILED_3"


def _attempt_count(code):
    if code in ("AUTO_FAILED_1", "AUTO_FAILED_2", "AUTO_FAILED_3"):
        return int(code.rsplit("_", 1)[1])
    return 0


def _publish(proposal_id):
    try:
        prepare_proposal.apply_async(args=[proposal_id], queue=CONTENT_QUEUE, retry=False)
        logger.info("Queued proposal %s on %s.", proposal_id, CONTENT_QUEUE)
    except Exception:
        logger.exception("Could not queue proposal %s; automatic recovery will retry dispatch.", proposal_id)


def enqueue_preparation(proposal_id):
    """Publish only after the upload transaction commits successfully."""
    transaction.on_commit(partial(_publish, proposal_id))


@shared_task(name=PREPARE_TASK_NAME, ignore_result=True,
             acks_late=True, reject_on_worker_lost=True)
def prepare_proposal(proposal_id):
    project_id = (ProjectProposalDocument.objects.filter(pk=proposal_id)
                  .values_list("project_id", flat=True).first())
    if project_id is None:
        logger.warning("Preparation skipped: proposal %s no longer exists.", proposal_id)
        return

    # Keep one project lock through checking, preparation, and failure accounting.
    # The processor's atomic block is nested inside this transaction.
    with transaction.atomic():
        project = (Project.objects.select_for_update(skip_locked=True)
                   .filter(pk=project_id).first())
        if project is None:
            logger.info("Proposal %s deferred: project is locked or was deleted.", proposal_id)
            return
        proposal = (ProjectProposalDocument.objects.filter(project_id=project_id)
                    .order_by("-version", "-pk").first())
        if proposal is None or proposal.pk != proposal_id:
            logger.info("Proposal %s skipped: not the latest version.", proposal_id)
            return
        if proposal.scan_status == ProjectProposalDocument.ScanStatus.INFECTED:
            logger.warning("Proposal %s remains blocked by a security alert.", proposal_id)
            return
        if proposal.processing_status == ProjectProposalDocument.ProcessingStatus.REJECTED:
            logger.warning("Rejected proposal %s is not retried automatically.", proposal_id)
            return
        if proposal_is_reader_ready(proposal):
            logger.info("Proposal %s is already reader-ready.", proposal_id)
            return

        previous_attempts = _attempt_count(proposal.processing_error_code)
        if proposal.processing_status == ProjectProposalDocument.ProcessingStatus.FAILED:
            if proposal.processing_error_code not in RETRY_CODES:
                logger.warning("Proposal %s needs review; failure code=%s.", proposal_id, proposal.processing_error_code)
                return
            if proposal.updated_at > timezone.now() - timedelta(seconds=RETRY_SECONDS):
                logger.info("Proposal %s is awaiting its automatic retry interval.", proposal_id)
                return
        if previous_attempts >= MAX_ATTEMPTS:
            return

        logger.info("Starting automatic preparation: project=%s proposal=%s attempt=%s/%s.",
                    project_id, proposal_id, previous_attempts + 1, MAX_ATTEMPTS)
        try:
            result = process_project_proposal(project_id, expected_proposal_id=proposal_id)
        except Exception:
            # process_project_proposal rolls back its savepoint, then persists
            # FAILED/REJECTED. The enclosing project lock is still held here.
            logger.exception("Automatic preparation failed: project=%s proposal=%s.", project_id, proposal_id)
            current = ProjectProposalDocument.objects.get(pk=proposal_id)
            if (current.processing_status == ProjectProposalDocument.ProcessingStatus.FAILED
                    and current.scan_status != ProjectProposalDocument.ScanStatus.INFECTED):
                attempt = min(previous_attempts + 1, MAX_ATTEMPTS)
                ProjectProposalDocument.objects.filter(pk=proposal_id).update(
                    processing_error_code=f"AUTO_FAILED_{attempt}", updated_at=timezone.now())
                if attempt < MAX_ATTEMPTS:
                    logger.warning("Proposal %s will be retried automatically after %s seconds.",
                                   proposal_id, RETRY_SECONDS)
                else:
                    logger.error("Proposal %s failed %s automatic attempts; inspect the preceding traceback. Publication remains blocked.",
                                 proposal_id, MAX_ATTEMPTS)
            return
        logger.info("Automatic proposal preparation completed: %s", result)


@shared_task(name=RECOVERY_TASK_NAME, ignore_result=True)
def enqueue_pending_proposals():
    latest_id = (ProjectProposalDocument.objects.filter(project_id=OuterRef("project_id"))
                 .order_by("-version", "-pk").values("pk")[:1])
    latest = (ProjectProposalDocument.objects.annotate(latest_id=Subquery(latest_id))
              .filter(pk=F("latest_id"))
              .exclude(scan_status=ProjectProposalDocument.ScanStatus.INFECTED))
    now = timezone.now()
    stale_seconds = max(900, settings.PROJECT_SCAN_TIMEOUT_SECONDS
                        + settings.PROJECT_RENDER_TIMEOUT_SECONDS + 300)
    stale_before = now - timedelta(seconds=stale_seconds)
    retry_before = now - timedelta(seconds=RETRY_SECONDS)

    candidates = latest.filter(
        Q(processing_status=ProjectProposalDocument.ProcessingStatus.PENDING)
        | Q(project__status=Project.Status.DRAFT,
            processing_status=ProjectProposalDocument.ProcessingStatus.FAILED,
            processing_error_code__in=RETRY_CODES, updated_at__lte=retry_before)
        | (Q(processing_status=ProjectProposalDocument.ProcessingStatus.PROCESSING)
           & (Q(processing_started_at__lt=stale_before)
              | Q(processing_started_at__isnull=True, updated_at__lt=stale_before)))
    ).order_by("updated_at", "pk")
    queued = 0
    for proposal in candidates[:25]:
        logger.info("Recovery dispatch: proposal=%s project=%s status=%s code=%s.",
                    proposal.pk, proposal.project_id, proposal.processing_status,
                    proposal.processing_error_code)
        enqueue_preparation(proposal.pk)
        queued += 1

    inconsistent = 0
    ready_drafts = latest.filter(project__status=Project.Status.DRAFT,
        processing_status=ProjectProposalDocument.ProcessingStatus.READY).order_by("updated_at", "pk")
    for proposal in ready_drafts.iterator(chunk_size=100):
        if proposal_is_reader_ready(proposal):
            continue
        logger.warning("Recovery dispatch: inconsistent READY proposal=%s project=%s.",
                       proposal.pk, proposal.project_id)
        enqueue_preparation(proposal.pk)
        inconsistent += 1
        if inconsistent >= 25:
            break
    logger.info("Proposal recovery completed: candidates=%s inconsistent_ready=%s.", queued, inconsistent)
