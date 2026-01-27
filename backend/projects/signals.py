"""
Project Signals - EDMS Integration

Triggers:
- Automatic folder structure creation when a project is created

Safeguards:
- Only runs on NEW projects (created=True), NOT on updates
- Uses transaction.on_commit to avoid database conflicts
- Catches and logs errors without breaking project creation
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

from .models import Project

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Project)
def create_project_folder_structure(sender, instance, created, **kwargs):
    """
    Auto-create EDMS folder structure when a project is created.
    
    IMPORTANT: This only runs when created=True to prevent:
    - Infinite loops (if folder creation somehow updates project)
    - Duplicate folder creation on every save
    - Performance issues on frequent project updates
    
    Args:
        sender: Project model class
        instance: Project instance being saved
        created: True if this is a new project, False if update
        **kwargs: Additional signal arguments
    """
    # GUARD: Only run on creation, never on updates
    if not created:
        return
    
    # Use on_commit to ensure project is fully saved before creating folders
    transaction.on_commit(
        lambda: _safe_create_folder_structure(instance)
    )


def _safe_create_folder_structure(project):
    """
    Safely create folder structure with error handling.
    
    Wrapped in try/except to ensure project creation never fails
    due to EDMS folder creation issues.
    """
    try:
        from edms.services.directory_service import DirectoryService
        
        logger.info(f"Creating EDMS folder structure for new project: {project.name}")
        
        folders_created = DirectoryService.ensure_project_structure(
            project=project,
            created_by=None  # System-initiated, no specific user
        )
        
        logger.info(
            f"EDMS folder structure created for {project.name}: "
            f"{folders_created} folders"
        )
        
    except Exception as e:
        # Log error but don't fail project creation
        logger.error(
            f"Failed to create EDMS folder structure for project {project.name}: {e}",
            exc_info=True
        )
        # In production, you might want to notify admins or queue for retry
        # For now, we just log and continue
