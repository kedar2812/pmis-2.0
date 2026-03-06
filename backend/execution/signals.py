"""
Signals for the execution app.

Signal 1 — Photo Sync:
    When a SiteImage with is_primary=True is saved, copy its image
    to the parent Project's latest_site_photo field.

Signal 2 — Progress Sync:
    When a DailySiteLog is saved, aggregate all achieved_quantities
    for the linked ScheduleTask and update its executed_quantity /
    computed_progress / physical_progress_pct.
"""
import logging
from decimal import Decimal

from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Signal 1: Primary site image → Project.latest_site_photo
# ---------------------------------------------------------------------------
@receiver(post_save, sender='execution.SiteImage')
def sync_primary_photo_to_project(sender, instance, **kwargs):
    """
    When a SiteImage with is_primary=True is saved, update the
    parent Project's latest_site_photo with this image file.
    Uses update_fields to prevent triggering unrelated Project signals.
    """
    if not instance.is_primary:
        return  # Only act on primary images

    try:
        project = instance.site_log.project
        # Copy the image name/path to the project field
        project.latest_site_photo = instance.image
        project.save(update_fields=['latest_site_photo'])
        logger.info(
            f"PhotoSync: Updated Project '{project.name}' (id={project.id}) "
            f"latest_site_photo → {instance.image.name}"
        )
    except Exception as e:
        # Non-fatal — log and continue
        logger.error(f"PhotoSync signal failed: {e}", exc_info=True)


# ---------------------------------------------------------------------------
# Signal 2: DailySiteLog saved → ScheduleTask progress update
# ---------------------------------------------------------------------------
@receiver(post_save, sender='execution.DailySiteLog')
def sync_task_progress(sender, instance, **kwargs):
    """
    When a DailySiteLog is saved, recalculate the linked ScheduleTask's
    executed_quantity by aggregating ALL logs for that task, then
    recompute computed_progress and physical_progress_pct.

    Uses update_fields to target only the relevant fields and avoid
    cascading saves or circular signal triggers.
    """
    try:
        task = instance.task

        # Aggregate total achieved quantity across ALL logs for this task
        agg = task.site_logs.aggregate(total=Sum('achieved_quantity'))
        total_quantity = agg['total'] or Decimal('0')

        task.executed_quantity = total_quantity

        # Recompute progress using the task's configured method
        new_progress = task.calculate_progress()
        task.computed_progress = new_progress

        # Update physical_progress_pct:
        # If the task is quantity-based and has planned_quantity, derive pct
        if task.planned_quantity and task.planned_quantity > 0:
            pct = min(
                (total_quantity / task.planned_quantity) * Decimal('100'),
                Decimal('100')
            )
            task.physical_progress_pct = pct.quantize(Decimal('0.01'))
        else:
            # Fallback: use computed_progress
            task.physical_progress_pct = Decimal(str(new_progress)).quantize(
                Decimal('0.01')
            )

        task.save(update_fields=[
            'executed_quantity',
            'computed_progress',
            'physical_progress_pct',
            'updated_at',
        ])

        logger.info(
            f"ProgressSync: Task '{task.name}' (id={task.id}) → "
            f"executed_qty={total_quantity}, "
            f"computed_progress={new_progress:.1f}%, "
            f"physical_progress_pct={task.physical_progress_pct}%"
        )
    except Exception as e:
        # Non-fatal — log and continue so the log is still saved
        logger.error(f"ProgressSync signal failed: {e}", exc_info=True)
