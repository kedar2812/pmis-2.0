"""
Package-related Django signals for automated workflows.

Handles:
- Automatic EDMS folder creation on package creation
- Agreement document upload to EDMS
- Contractor notification on package assignment
"""

import logging
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.db import transaction
from .models import WorkPackage
from .document_service import PackageDocumentService
from .notification_service import PackageNotificationService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=WorkPackage)
def handle_package_creation(sender, instance, created, **kwargs):
    """
    Automatically create EDMS folder when package is created.
    
    This runs AFTER the package is saved to ensure we have a valid ID.
    
    Args:
        sender: WorkPackage model class
        instance: WorkPackage instance that was saved
        created: Boolean indicating if this is a new instance
        **kwargs: Additional signal kwargs
    """
    if not created:
        return  # Only run for newly created packages
    
    try:
        # Create EDMS folder if not already created
        if not instance.package_folder_edms:
            logger.info(f"Creating EDMS folder for new package {instance.id}")
            
            # Use atomic transaction to ensure data consistency
            with transaction.atomic():
                package_folder = PackageDocumentService.create_package_folder_in_edms(
                    instance.project,
                    instance
                )
                
                # Update package with folder reference
                instance.package_folder_edms = package_folder
                instance.save(update_fields=['package_folder_edms'])
                
                logger.info(f"Successfully created EDMS folder for package {instance.id}: {package_folder.id}")
        
        # Send notification to contractor if assigned
        if instance.contractor_master:
            try:
                logger.info(f"Sending assignment notification for package {instance.id}") 
                notification_result = PackageNotificationService.send_package_assignment_notification(
                    instance,
                    assigned_by=None  # Could be tracked via created_by field if available
                )
                
                if notification_result['success']:
                    logger.info(f"Successfully sent notification for package {instance.id}: {notification_result}")
                else:
                    logger.warning(f"Failed to send notification for package {instance.id}: {notification_result.get('error')}")
                    
            except Exception as notif_error:
                # Log error but don't block package creation
                logger.error(f"Error sending notification for package {instance.id}: {str(notif_error)}", exc_info=True)
    
    except Exception as e:
        # Log error but don't block package creation
        # Folder can be created manually later if needed
        logger.error(
            f"Failed to create EDMS folder for package {instance.id}: {str(e)}",
            exc_info=True,
            extra={'package_id': instance.id, 'project_id': instance.project.id}
        )


@receiver(post_save, sender=WorkPackage)
def handle_agreement_upload_to_edms(sender, instance, created, **kwargs):
    """
    Upload agreement document to EDMS after package folder is created.
    
    This signal runs AFTER the EDMS folder is created to ensure we have a destination.
    Uses update_fields check to avoid infinite signal loops.
    
    Args:
        sender: WorkPackage model class
        instance: WorkPackage instance that was saved
        created: Boolean indicating if this is a new instance
        **kwargs: Additional signal kwargs (includes 'update_fields')
    """
    # Only process if:
    # 1. Package was just created OR
    # 2. Agreement document was just uploaded (not during folder creation)
    update_fields = kwargs.get('update_fields', None)
    
    # Avoid infinite loops - don't trigger if we're just updating EDMS references
    if update_fields and 'package_folder_edms' in update_fields:
        return
    if update_fields and 'agreement_document_edms' in update_fields:
        return
    
    # Check if we have agreement file and folder ready
    if not instance.agreement_document:
        return  # No document to upload yet
    
    if not instance.package_folder_edms:
        logger.warning(f"Cannot upload agreement for package {instance.id}: EDMS folder not created yet")
        return
    
    if instance.agreement_document_edms:
        logger.info(f"Agreement already uploaded to EDMS for package {instance.id}")
        return  # Already uploaded
    
    try:
        logger.info(f"Uploading agreement document to EDMS for package {instance.id}")
        
        # Use atomic transaction for data integrity
        with transaction.atomic():
            # Upload to EDMS
            edms_document = PackageDocumentService.upload_agreement_to_edms(
                instance,
                instance.agreement_document,
                instance.package_folder_edms,
                uploaded_by=instance.responsible_staff
            )
            
            # Update package with EDMS document reference
            instance.agreement_document_edms = edms_document
            instance.save(update_fields=['agreement_document_edms'])
            
            logger.info(f"Successfully uploaded agreement to EDMS for package {instance.id}: Document ID {edms_document.id}")
            
            # Clean up temporary file after successful EDMS upload
            try:
                if instance.agreement_document:
                    instance.agreement_document.delete(save=False)
                    logger.info(f"Cleaned up temporary agreement file for package {instance.id}")
            except Exception as cleanup_error:
                # Log but don't fail if cleanup fails
                logger.warning(f"Failed to cleanup temporary file for package {instance.id}: {str(cleanup_error)}")
    
    except Exception as e:
        # Log error with full context
        logger.error(
            f"Failed to upload agreement to EDMS for package {instance.id}: {str(e)}",
            exc_info=True,
            extra={
                'package_id': instance.id,
                'project_id': instance.project.id,
                'folder_id': instance.package_folder_edms.id if instance.package_folder_edms else None
            }
        )


@receiver(pre_delete, sender=WorkPackage)
def handle_package_deletion(sender, instance, **kwargs):
    """
    Archive EDMS folder when package is deleted (soft delete for audit trail).
    
    Args:
        sender: WorkPackage model class
        instance: WorkPackage instance being deleted
        **kwargs: Additional signal kwargs
    """
    try:
        logger.info(f"Archiving EDMS folder for deleted package {instance.id}")
        
        success = PackageDocumentService.archive_package_folder(instance)
        
        if success:
            logger.info(f"Successfully archived EDMS folder for package {instance.id}")
        else:
            logger.warning(f"No EDMS folder to archive for package {instance.id}")
    
    except Exception as e:
        # Log error but don't block deletion
        logger.error(
            f"Failed to archive EDMS folder for package {instance.id}: {str(e)}",
            exc_info=True,
            extra={'package_id': instance.id}
        )
