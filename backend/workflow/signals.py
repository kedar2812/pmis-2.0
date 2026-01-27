"""
Workflow Signals

Auto-starts workflows when documents are submitted.
Uses lazy imports to avoid circular dependency issues.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


def start_workflow_on_submit(sender, instance, created, **kwargs):
    """
    Generic handler to start workflow when a document is submitted.
    
    Conditions:
    1. Not a new object (update only)
    2. Status is 'SUBMITTED'
    3. No active workflow exists for this entity
    """
    # Skip if newly created (status change comes later)
    if created:
        return
    
    # Check if status is SUBMITTED
    status = getattr(instance, 'status', None)
    if status != 'SUBMITTED':
        return
    
    # Lazy import to avoid circular dependency
    from .engine import workflow_engine
    from .models import WorkflowInstance, WorkflowStatus
    
    entity_type = sender.__name__
    entity_id = str(instance.pk)
    
    # Check for existing active workflow
    existing = WorkflowInstance.objects.filter(
        entity_type=entity_type,
        entity_id=entity_id,
        status__in=[WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
    ).exists()
    
    if existing:
        logger.info(f"Active workflow already exists for {entity_type} {entity_id}")
        return
    
    # Start workflow - get the user who triggered the change
    # Try to get user from instance attributes (set by view)
    user = getattr(instance, '_current_user', None)
    if not user:
        # Fallback to contractor for RABill
        user = getattr(instance, 'contractor', None)
        if not user:
            # Final fallback to created_by
            user = getattr(instance, 'created_by', None)
    
    if not user:
        logger.warning(f"Cannot start workflow for {entity_type} {entity_id}: No user found")
        return
    
    try:
        result = workflow_engine.start_workflow(
            entity_type=entity_type,
            entity_id=entity_id,
            entity=instance,
            user=user
        )
        if result:
            logger.info(f"Started workflow {result.id} for {entity_type} {entity_id}")
        else:
            logger.warning(f"No workflow template found for {entity_type} {entity_id}")
    except Exception as e:
        logger.error(f"Failed to start workflow for {entity_type} {entity_id}: {str(e)}")


def connect_signals():
    """
    Connect workflow signals to models.
    Called from AppConfig.ready().
    
    Uses lazy imports to avoid circular dependencies.
    """
    # Lazy import models to avoid circular dependency
    from django.apps import apps
    
    try:
        RABill = apps.get_model('finance', 'RABill')
        post_save.connect(
            start_workflow_on_submit,
            sender=RABill,
            dispatch_uid='workflow_rabill_submit'
        )
        logger.info("Connected workflow signal to RABill")
    except LookupError:
        logger.warning("RABill model not found - skipping signal connection")
    
    try:
        Tender = apps.get_model('procurement', 'Tender')
        post_save.connect(
            start_workflow_on_submit,
            sender=Tender,
            dispatch_uid='workflow_tender_submit'
        )
        logger.info("Connected workflow signal to Tender")
    except LookupError:
        logger.warning("Tender model not found - skipping signal connection")
    
    try:
        Variation = apps.get_model('procurement', 'Variation')
        post_save.connect(
            start_workflow_on_submit,
            sender=Variation,
            dispatch_uid='workflow_variation_submit'
        )
        logger.info("Connected workflow signal to Variation")
    except LookupError:
        logger.warning("Variation model not found - skipping signal connection")
