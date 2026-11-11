"""Public visibility and funding classification; no applicant joins."""
from django.db.models import Exists, OuterRef
from apps.funding.models import Funding
from .models import Project

# Funding is an award model. These states mean a positive approved commitment,
# not proof of a completed cash payment. Suspended awards are not 'never funded'.
COMMITTED_FUNDING_STATES = (
    Funding.Status.APPROVED, Funding.Status.ACTIVE, Funding.Status.SUSPENDED,
    Funding.Status.COMPLETED, Funding.Status.CLOSED,
)
SEEKING_STATUSES = (
    Project.Status.POSTED, Project.Status.SUBMITTED, Project.Status.UNDER_EVALUATION,
    Project.Status.SHORTLISTED, Project.Status.SELECTED, Project.Status.REJECTED,
)


def has_committed_funding(project):
    return Funding.objects.filter(
        project=project, status__in=COMMITTED_FUNDING_STATES, approved_amount__gt=0,
    ).exists()


def public_projects():
    award = Funding.objects.filter(
        project_id=OuterRef("pk"), status__in=COMMITTED_FUNDING_STATES,
        approved_amount__gt=0,
    )
    return Project.objects.filter(posted_at__isnull=False).exclude(
        status__in=[Project.Status.DRAFT, Project.Status.CANCELLED, Project.Status.SUSPENDED],
    ).annotate(has_approved_funding=Exists(award))


def seeking_funding_projects():
    return public_projects().filter(
        has_approved_funding=False, requested_amount__gt=0, status__in=SEEKING_STATUSES,
    ).order_by("-posted_at", "-pk")


def featured_in_progress():
    return public_projects().filter(
        has_approved_funding=True, status=Project.Status.IN_PROGRESS,
        progress_percentage__isnull=False, progress_percentage__lte=90,
    ).order_by("-progress_percentage", "-posted_at", "-pk")[:4]


def featured_completed():
    return public_projects().filter(
        has_approved_funding=True, status=Project.Status.COMPLETED,
        completed_at__isnull=False,
    ).order_by("-completed_at", "-pk")[:4]
