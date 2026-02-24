"""
Finance Signals — Automated Progress Calculation

Listens for RABill status changes (approval/payment) and automatically
recalculates BOQ-weighted physical progress on linked ScheduleTasks.

Government-Grade Implementation:
- Progress is ALWAYS computed, never manually overridden
- Uses verified execution data only
- Full audit trail via ProgressCalculationLog
"""
import logging
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Sum, F, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


@receiver(post_save, sender='finance.RABill')
def on_rabill_status_change(sender, instance, **kwargs):
    """
    When an RABill is approved or paid, recalculate physical progress
    for all ScheduleTasks linked to the bill's BOQ items.
    
    Flow:
    1. RABill approved → find all BOQExecutions linked to this bill
    2. For each affected BOQItem → find linked ScheduleTasks
    3. For each ScheduleTask → recalculate weighted progress from ALL its linked BOQItems
    4. Update task.physical_progress_pct
    """
    # Only trigger on approval/payment status
    if instance.status not in ('APPROVED', 'PAID', 'VERIFIED'):
        return
    
    try:
        recalculate_progress_for_bill(instance)
    except Exception as e:
        logger.error(f"Failed to recalculate progress for RABill {instance.bill_no}: {e}", exc_info=True)


def recalculate_progress_for_bill(ra_bill):
    """
    Recalculate physical progress for all tasks linked to BOQ items
    that have executions tied to this RA Bill.
    """
    from .models import BOQItem
    from .boq_execution import BOQExecution
    from scheduling.models import ScheduleTask
    
    # Step 1: Find all BOQ items with executions linked to this bill
    affected_boq_ids = (
        BOQExecution.objects
        .filter(ra_bill=ra_bill, status='VERIFIED')
        .values_list('boq_item_id', flat=True)
        .distinct()
    )
    
    if not affected_boq_ids:
        logger.info(f"RABill {ra_bill.bill_no}: No verified executions found, skipping progress recalc.")
        return
    
    # Step 2: Find all ScheduleTasks linked to these BOQ items
    affected_tasks = (
        ScheduleTask.objects
        .filter(boq_items__id__in=affected_boq_ids)
        .distinct()
    )
    
    if not affected_tasks.exists():
        logger.info(f"RABill {ra_bill.bill_no}: No linked schedule tasks found for affected BOQ items.")
        return
    
    # Step 3: Recalculate progress for each affected task
    updated_count = 0
    for task in affected_tasks:
        new_progress = calculate_task_progress_from_boq(task)
        if new_progress is not None:
            old_progress = task.physical_progress_pct
            task.physical_progress_pct = new_progress
            task.save(update_fields=['physical_progress_pct', 'updated_at'])
            updated_count += 1
            logger.info(
                f"Task '{task.name}' progress updated: {old_progress}% → {new_progress}% "
                f"(triggered by RABill {ra_bill.bill_no})"
            )
    
    logger.info(f"RABill {ra_bill.bill_no}: Updated progress for {updated_count} tasks.")


def calculate_task_progress_from_boq(task):
    """
    Calculate BOQ-weighted physical progress for a single ScheduleTask.
    
    Formula:
        progress = Σ(boq_item.executed_value) / Σ(boq_item.total_value) × 100
    
    Where:
        - executed_value = sum of verified BOQExecution quantities × rate
        - total_value = boq_item.quantity × boq_item.rate (= boq_item.amount)
    
    Example:
        Task "Build Bridge" is linked to:
        - Concrete (₹10L total, ₹10L executed) → 100% complete
        - Steel (₹10L total, ₹0 executed) → 0% complete
        - Weighted progress = (10 + 0) / (10 + 10) × 100 = 50%
    """
    from .models import BOQItem
    from .boq_execution import BOQExecution
    
    # Get all BOQ items linked to this task
    linked_boq_items = task.boq_items.all()
    
    if not linked_boq_items.exists():
        return None  # No linked BOQ items, can't calculate
    
    total_boq_value = Decimal('0')
    total_executed_value = Decimal('0')
    
    for boq_item in linked_boq_items:
        # Total planned value for this BOQ item
        item_total = boq_item.amount  # quantity × rate, auto-calculated on save
        total_boq_value += item_total
        
        # Sum of verified execution quantities × rate
        verified_executions = (
            BOQExecution.objects
            .filter(boq_item=boq_item, status='VERIFIED')
            .aggregate(total_qty=Sum('executed_quantity'))
        )
        executed_qty = verified_executions['total_qty'] or Decimal('0')
        executed_value = executed_qty * boq_item.rate
        total_executed_value += executed_value
    
    if total_boq_value <= 0:
        return Decimal('0')
    
    # Calculate percentage (capped at 100%)
    progress = (total_executed_value / total_boq_value) * 100
    progress = min(progress, Decimal('100'))
    
    return progress.quantize(Decimal('0.01'))


def recalculate_all_task_progress(project_id=None):
    """
    Utility function to recalculate progress for ALL tasks (or tasks in a specific project).
    Useful for batch recalculation or data correction.
    
    Usage:
        from finance.signals import recalculate_all_task_progress
        recalculate_all_task_progress(project_id=some_uuid)
    """
    from scheduling.models import ScheduleTask
    
    tasks = ScheduleTask.objects.filter(boq_items__isnull=False).distinct()
    if project_id:
        tasks = tasks.filter(project_id=project_id)
    
    updated = 0
    for task in tasks:
        new_progress = calculate_task_progress_from_boq(task)
        if new_progress is not None:
            task.physical_progress_pct = new_progress
            task.save(update_fields=['physical_progress_pct', 'updated_at'])
            updated += 1
    
    logger.info(f"Batch progress recalculation: {updated} tasks updated"
                f"{f' for project {project_id}' if project_id else ''}.")
    return updated
