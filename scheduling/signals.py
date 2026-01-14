"""
Scheduling App Signals

This module defines Django signals for the scheduling app.
The key signal triggers project progress recalculation when tasks are modified.

CRITICAL: Signal handlers use transaction.on_commit() to ensure
the recalculation runs AFTER the database transaction commits.
This prevents race conditions and ensures data consistency.
"""

from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='scheduling.ScheduleTask')
def schedule_task_saved(sender, instance, created, **kwargs):
    """
    Signal handler for ScheduleTask save events.
    
    Triggers project progress recalculation after the transaction commits.
    Uses on_commit() to prevent race conditions.
    """
    project_id = instance.project_id
    
    if project_id:
        # Schedule recalculation to run after transaction commits
        transaction.on_commit(
            lambda: _trigger_recalculation(project_id, 'save')
        )


@receiver(post_delete, sender='scheduling.ScheduleTask')
def schedule_task_deleted(sender, instance, **kwargs):
    """
    Signal handler for ScheduleTask delete events.
    
    Triggers project progress recalculation after the transaction commits.
    """
    project_id = instance.project_id
    
    if project_id:
        # Schedule recalculation to run after transaction commits
        transaction.on_commit(
            lambda: _trigger_recalculation(project_id, 'delete')
        )


def _trigger_recalculation(project_id, event_type):
    """
    Internal function to trigger the recalculation.
    
    This runs AFTER the transaction commits, ensuring all task
    changes are visible to the calculator.
    
    Args:
        project_id: ID of the project to recalculate.
        event_type: 'save' or 'delete' for logging purposes.
    """
    try:
        from projects.services.progress_calculator import recalculate_project_progress
        
        logger.debug(
            f"Triggering progress recalculation for Project {project_id} "
            f"after task {event_type}"
        )
        
        result = recalculate_project_progress(project_id)
        
        if result['success']:
            logger.debug(
                f"Progress recalculation successful for Project {project_id}: "
                f"Physical={result['physical_progress']:.1f}%"
            )
        else:
            logger.warning(
                f"Progress recalculation failed for Project {project_id}: "
                f"{result['errors']}"
            )
            
    except Exception as e:
        # Log but don't raise - we don't want to break the main operation
        logger.error(
            f"Error in progress recalculation signal for Project {project_id}: {str(e)}",
            exc_info=True
        )
