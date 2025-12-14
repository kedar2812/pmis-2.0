"""
EDMS Services - Business Logic Layer

Implements:
- Document upload and versioning
- Workflow management (submit, validate, approve, reject)
- Folder operations
- Audit logging
- Notification integration with Communications
"""
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta

from .models import (
    Document, DocumentVersion, Folder,
    ApprovalWorkflow, ApprovalStep, DocumentAuditLog
)


class AuditService:
    """
    Creates immutable audit log entries for all EDMS actions.
    """
    
    @staticmethod
    def log(actor, action, resource_type, resource_id, details=None, request=None):
        """Create an audit log entry."""
        ip_address = None
        user_agent = ''
        
        if request:
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        return DocumentAuditLog.objects.create(
            actor=actor,
            actor_role=getattr(actor, 'role', 'Unknown') if actor else 'System',
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )


class DocumentService:
    """
    Handles document operations with version control.
    """
    
    @staticmethod
    def upload_document(user, project, file, title, document_type, 
                        folder=None, description='', change_notes='Initial upload',
                        is_confidential=False, metadata=None, request=None):
        """
        Upload a new document with initial version.
        """
        import os
        
        # Create document record
        document = Document.objects.create(
            title=title,
            description=description,
            document_type=document_type,
            project=project,
            folder=folder,
            status=Document.Status.DRAFT,
            is_confidential=is_confidential,
            metadata=metadata or {},
            uploaded_by=user
        )
        
        # Create initial version
        version = DocumentVersion.objects.create(
            document=document,
            file=file,
            file_name=file.name,
            file_size=file.size,
            mime_type=file.content_type or 'application/octet-stream',
            uploaded_by=user,
            change_notes=change_notes
        )
        
        # Set current version
        document.current_version = version
        document.save(update_fields=['current_version'])
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.UPLOAD,
            resource_type='Document',
            resource_id=document.id,
            details={
                'title': title,
                'type': document_type,
                'file_name': file.name,
                'version': version.version_number
            },
            request=request
        )
        
        return document
    
    @staticmethod
    def create_new_version(user, document, file, change_notes='', request=None):
        """
        Create a new version of an existing document.
        """
        # Check if document is editable
        if not document.can_be_edited_by(user):
            raise PermissionError("You cannot upload a new version of this document in its current state.")
        
        version = DocumentVersion.objects.create(
            document=document,
            file=file,
            file_name=file.name,
            file_size=file.size,
            mime_type=file.content_type or 'application/octet-stream',
            uploaded_by=user,
            change_notes=change_notes
        )
        
        # Update document's current version
        document.current_version = version
        
        # If document was in REVISION_REQUESTED, move back to DRAFT
        if document.status == Document.Status.REVISION_REQUESTED:
            document.status = Document.Status.DRAFT
            document.save(update_fields=['status', 'current_version'])
        else:
            document.save(update_fields=['current_version'])
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.VERSION_CREATED,
            resource_type='Document',
            resource_id=document.id,
            details={
                'version': version.version_number,
                'file_name': file.name,
                'change_notes': change_notes
            },
            request=request
        )
        
        return version
    
    @staticmethod
    def move_document(user, document, target_folder, request=None):
        """
        Move document to a different folder.
        """
        old_folder = document.folder
        document.folder = target_folder
        document.save(update_fields=['folder', 'updated_at'])
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.MOVED,
            resource_type='Document',
            resource_id=document.id,
            details={
                'from_folder': str(old_folder.id) if old_folder else None,
                'to_folder': str(target_folder.id) if target_folder else None
            },
            request=request
        )
        
        return document
    
    @staticmethod
    def log_view(user, document, request=None):
        """Log document view action."""
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.VIEW,
            resource_type='Document',
            resource_id=document.id,
            request=request
        )
    
    @staticmethod
    def log_download(user, document, version=None, request=None):
        """Log document download action."""
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.DOWNLOAD,
            resource_type='Document',
            resource_id=document.id,
            details={'version': version.version_number if version else document.current_version.version_number},
            request=request
        )


class WorkflowService:
    """
    Manages document approval workflow.
    """
    
    # Default SLA for document approval (in hours)
    DEFAULT_SLA_HOURS = 72  # 3 days
    
    @staticmethod
    def submit_for_review(user, document, request=None):
        """
        Submit document for PMNC review.
        Creates workflow and notifies reviewers.
        """
        if document.status != Document.Status.DRAFT:
            raise ValueError("Only DRAFT documents can be submitted for review.")
        
        # Update document status
        document.status = Document.Status.UNDER_REVIEW
        document.save(update_fields=['status', 'updated_at'])
        
        # Create or update workflow
        workflow, created = ApprovalWorkflow.objects.get_or_create(
            document=document,
            defaults={
                'initiated_by': user,
                'deadline': timezone.now() + timedelta(hours=WorkflowService.DEFAULT_SLA_HOURS)
            }
        )
        
        if not created:
            workflow.status = ApprovalWorkflow.WorkflowStatus.IN_PROGRESS
            workflow.save(update_fields=['status'])
        
        # Create PMNC review step
        ApprovalStep.objects.create(
            workflow=workflow,
            step_type=ApprovalStep.StepType.PMNC_REVIEW,
            step_order=1,
            role_required='PMNC_Team'
        )
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.SUBMITTED_FOR_REVIEW,
            resource_type='Document',
            resource_id=document.id,
            request=request
        )
        
        # Send notification
        WorkflowService._notify_reviewers(document, 'PMNC_Team', 'New Document for Review')
        
        return workflow
    
    @staticmethod
    def validate_document(user, document, comments='', request=None):
        """
        PMNC validates the document.
        Moves to VALIDATED status awaiting SPV approval.
        """
        if document.status != Document.Status.UNDER_REVIEW:
            raise ValueError("Only documents UNDER_REVIEW can be validated.")
        
        # Update document status
        document.status = Document.Status.VALIDATED
        document.save(update_fields=['status', 'updated_at'])
        
        # Update workflow
        workflow = document.workflow
        workflow.status = ApprovalWorkflow.WorkflowStatus.VALIDATED
        workflow.save(update_fields=['status'])
        
        # Update PMNC step
        pmnc_step = workflow.steps.filter(step_type=ApprovalStep.StepType.PMNC_REVIEW).first()
        if pmnc_step:
            pmnc_step.action = ApprovalStep.Action.VALIDATED
            pmnc_step.actor = user
            pmnc_step.acted_at = timezone.now()
            pmnc_step.comments = comments
            pmnc_step.save()
        
        # Create SPV approval step
        ApprovalStep.objects.create(
            workflow=workflow,
            step_type=ApprovalStep.StepType.SPV_APPROVAL,
            step_order=2,
            role_required='SPV_Official'
        )
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.VALIDATED,
            resource_type='Document',
            resource_id=document.id,
            details={'comments': comments},
            request=request
        )
        
        # Notify SPV for final approval
        WorkflowService._notify_reviewers(document, 'SPV_Official', 'Document Awaiting Final Approval')
        
        return document
    
    @staticmethod
    def request_revision(user, document, comments, request=None):
        """
        Request revision from uploader.
        """
        if document.status != Document.Status.UNDER_REVIEW:
            raise ValueError("Only documents UNDER_REVIEW can have revision requested.")
        
        # Update document status
        document.status = Document.Status.REVISION_REQUESTED
        document.save(update_fields=['status', 'updated_at'])
        
        # Update PMNC step
        workflow = document.workflow
        pmnc_step = workflow.steps.filter(step_type=ApprovalStep.StepType.PMNC_REVIEW).first()
        if pmnc_step:
            pmnc_step.action = ApprovalStep.Action.REVISION_REQUESTED
            pmnc_step.actor = user
            pmnc_step.acted_at = timezone.now()
            pmnc_step.comments = comments
            pmnc_step.save()
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.REVISION_REQUESTED,
            resource_type='Document',
            resource_id=document.id,
            details={'comments': comments},
            request=request
        )
        
        # Notify uploader
        WorkflowService._notify_user(
            document.uploaded_by, 
            document, 
            'Revision Requested',
            f'Your document "{document.title}" requires revision: {comments}'
        )
        
        return document
    
    @staticmethod
    def approve_document(user, document, comments='', request=None):
        """
        SPV gives final approval.
        """
        if document.status != Document.Status.VALIDATED:
            raise ValueError("Only VALIDATED documents can receive final approval.")
        
        # Update document status
        document.status = Document.Status.APPROVED
        document.save(update_fields=['status', 'updated_at'])
        
        # Update workflow
        workflow = document.workflow
        workflow.status = ApprovalWorkflow.WorkflowStatus.APPROVED
        workflow.completed_at = timezone.now()
        workflow.save(update_fields=['status', 'completed_at'])
        
        # Update SPV step
        spv_step = workflow.steps.filter(step_type=ApprovalStep.StepType.SPV_APPROVAL).first()
        if spv_step:
            spv_step.action = ApprovalStep.Action.APPROVED
            spv_step.actor = user
            spv_step.acted_at = timezone.now()
            spv_step.comments = comments
            spv_step.save()
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.APPROVED,
            resource_type='Document',
            resource_id=document.id,
            details={'comments': comments},
            request=request
        )
        
        # Notify uploader
        WorkflowService._notify_user(
            document.uploaded_by,
            document,
            'Document Approved',
            f'Your document "{document.title}" has been approved.'
        )
        
        return document
    
    @staticmethod
    def reject_document(user, document, comments, request=None):
        """
        SPV rejects the document.
        """
        if document.status != Document.Status.VALIDATED:
            raise ValueError("Only VALIDATED documents can be rejected at SPV level.")
        
        # Update document status
        document.status = Document.Status.REJECTED
        document.save(update_fields=['status', 'updated_at'])
        
        # Update workflow
        workflow = document.workflow
        workflow.status = ApprovalWorkflow.WorkflowStatus.REJECTED
        workflow.completed_at = timezone.now()
        workflow.save(update_fields=['status', 'completed_at'])
        
        # Update SPV step
        spv_step = workflow.steps.filter(step_type=ApprovalStep.StepType.SPV_APPROVAL).first()
        if spv_step:
            spv_step.action = ApprovalStep.Action.REJECTED
            spv_step.actor = user
            spv_step.acted_at = timezone.now()
            spv_step.comments = comments
            spv_step.save()
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.REJECTED,
            resource_type='Document',
            resource_id=document.id,
            details={'comments': comments},
            request=request
        )
        
        # Notify uploader
        WorkflowService._notify_user(
            document.uploaded_by,
            document,
            'Document Rejected',
            f'Your document "{document.title}" has been rejected: {comments}'
        )
        
        return document
    
    @staticmethod
    def get_pending_approvals(user):
        """
        Get documents pending action from this user based on role.
        """
        role = getattr(user, 'role', None)
        
        if role in ['PMNC_Team']:
            # PMNC sees documents under review
            return Document.objects.filter(status=Document.Status.UNDER_REVIEW)
        elif role in ['SPV_Official', 'NICDC_HQ']:
            # SPV sees validated documents
            return Document.objects.filter(status=Document.Status.VALIDATED)
        
        return Document.objects.none()
    
    @staticmethod
    def _notify_reviewers(document, role, title):
        """Send notification to all users with specified role."""
        try:
            from communications.models import Notification
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            reviewers = User.objects.filter(role=role)
            
            for reviewer in reviewers:
                Notification.objects.create(
                    recipient=reviewer,
                    notification_type=Notification.NotificationType.ACTION_REQUIRED,
                    title=title,
                    message=f'Document "{document.title}" requires your attention.',
                    context_type=ContentType.objects.get_for_model(Document),
                    context_id=document.id,
                    deep_link=f'/edms?document={document.id}'
                )
        except Exception as e:
            # Log error but don't fail the workflow
            print(f"Failed to send notification: {e}")
    
    @staticmethod
    def _notify_user(user, document, title, message):
        """Send notification to a specific user."""
        try:
            from communications.models import Notification
            
            if user:
                Notification.objects.create(
                    recipient=user,
                    notification_type=Notification.NotificationType.ACTION_REQUIRED,
                    title=title,
                    message=message,
                    context_type=ContentType.objects.get_for_model(Document),
                    context_id=document.id,
                    deep_link=f'/edms?document={document.id}'
                )
        except Exception as e:
            print(f"Failed to send notification: {e}")


class FolderService:
    """
    Manages folder operations.
    """
    
    @staticmethod
    def create_folder(user, project, name, parent=None, request=None):
        """Create a new folder."""
        folder = Folder.objects.create(
            name=name,
            project=project,
            parent=parent,
            created_by=user
        )
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.FOLDER_CREATED,
            resource_type='Folder',
            resource_id=folder.id,
            details={
                'name': name,
                'parent': str(parent.id) if parent else None,
                'project': str(project.id)
            },
            request=request
        )
        
        return folder
    
    @staticmethod
    def get_folder_tree(project):
        """Get hierarchical folder structure for a project."""
        folders = Folder.objects.filter(project=project, parent__isnull=True)
        return folders
    
    @staticmethod
    def move_folder(user, folder, new_parent, request=None):
        """Move folder to new parent (within same project)."""
        if new_parent and new_parent.project != folder.project:
            raise ValueError("Cannot move folder to a different project.")
        
        old_parent = folder.parent
        folder.parent = new_parent
        folder.save(update_fields=['parent'])
        
        # Audit log
        AuditService.log(
            actor=user,
            action=DocumentAuditLog.Action.FOLDER_MOVED,
            resource_type='Folder',
            resource_id=folder.id,
            details={
                'from_parent': str(old_parent.id) if old_parent else None,
                'to_parent': str(new_parent.id) if new_parent else None
            },
            request=request
        )
        
        return folder
