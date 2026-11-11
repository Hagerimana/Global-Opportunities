from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.projects.models import ProjectProposalDocument
from apps.projects.tasks import enqueue_preparation

@receiver(post_save, sender=ProjectProposalDocument,
          dispatch_uid="proposal_preparation.enqueue_saved_pending_v1")
def enqueue_saved_pending_proposal(sender, instance, raw=False, **kwargs):
    if raw or not instance.original_file:
        return
    if instance.processing_status != ProjectProposalDocument.ProcessingStatus.PENDING:
        return
    if instance.scan_status == ProjectProposalDocument.ScanStatus.INFECTED:
        return
    enqueue_preparation(instance.pk)
