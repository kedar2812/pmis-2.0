"""
EDMS Models - Electronic Document Management System

Implements:
- Folder hierarchy (per-project)
- Document with version control
- Workflow-based approvals (Draft → Under Review → Validated → Approved)
- Immutable audit logging
- No deletion allowed (soft archive only)
"""
import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Folder(models.Model):
    """
    Hierarchical folder structure within a project.
    Each project has its own folder tree.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='folders'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subfolders'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_folders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['name', 'parent', 'project']
    
    def __str__(self):
        return f"{self.project.name}/{self.get_full_path()}"
    
    def get_full_path(self):
        """Returns the full path from root to this folder."""
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.name}"
        return self.name
    
    def get_ancestors(self):
        """Returns list of ancestor folders (for breadcrumb)."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors


class Document(models.Model):
    """
    Core document entity with workflow status.
    Documents are never deleted, only archived.
    """
    
    class DocumentType(models.TextChoices):
        DRAWING = 'DRAWING', 'Drawing'
        REPORT = 'REPORT', 'Report'
        CONTRACT = 'CONTRACT', 'Contract'
        CORRESPONDENCE = 'CORRESPONDENCE', 'Correspondence'
        SPECIFICATION = 'SPECIFICATION', 'Specification'
        INVOICE = 'INVOICE', 'Invoice'
        MEDIA = 'MEDIA', 'Media'
        OTHER = 'OTHER', 'Other'
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        REVISION_REQUESTED = 'REVISION_REQUESTED', 'Revision Requested'
        VALIDATED = 'VALIDATED', 'Validated'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        ARCHIVED = 'ARCHIVED', 'Archived'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )
    document_number = models.CharField(max_length=100, blank=True, help_text="Official document reference number")
    
    # Location
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='documents'
    )
    folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )
    
    # Workflow status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    # Current version reference
    current_version = models.ForeignKey(
        'DocumentVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_for_document'
    )
    
    # Metadata
    is_confidential = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Flexible additional attributes")
    
    # Tracking
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} (v{self.current_version.version_number if self.current_version else 0})"
    
    def save(self, *args, **kwargs):
        if not self.document_number:
            from django.utils import timezone
            import datetime
            
            now = timezone.now()
            year = now.year
            prefix = f"DOC-{year}"
            
            # Find the last document number for this year
            # This is a naive implementation; for high concurrency use a separate Sequence model
            last_doc = Document.objects.filter(
                document_number__startswith=prefix
            ).order_by('created_at').last()
            
            last_seq = 0
            if last_doc and last_doc.document_number:
                try:
                    parts = last_doc.document_number.split('-')
                    if len(parts) >= 3:
                        last_seq = int(parts[-1])
                except ValueError:
                    pass
            
            new_seq = last_seq + 1
            self.document_number = f"{prefix}-{new_seq:05d}"
            
        super().save(*args, **kwargs)
    
    def can_be_edited_by(self, user):
        """Check if document can be edited by user based on status and role."""
        # Only DRAFT and REVISION_REQUESTED allow edits
        if self.status not in [self.Status.DRAFT, self.Status.REVISION_REQUESTED]:
            return False
        
        # Only uploader or admins can edit
        if self.uploaded_by == user:
            return True
        if user.role in ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']:
            return True
        return False
    
    def get_version_count(self):
        return self.versions.count()


def document_file_path(instance, filename):
    """Generate file path: documents/{project_id}/{document_id}/{version}/{filename}"""
    return f"documents/{instance.document.project_id}/{instance.document_id}/{instance.version_number}/{filename}"


class DocumentVersion(models.Model):
    """
    Immutable version record for a document.
    Each new upload creates a new version.
    Cannot be modified after creation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    
    # File storage (S3-ready)
    file = models.FileField(upload_to=document_file_path)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text="Size in bytes")
    file_hash = models.CharField(max_length=64, help_text="SHA-256 hash for integrity")
    mime_type = models.CharField(max_length=100)
    
    # Tracking
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    change_notes = models.TextField(blank=True, help_text="What changed in this version")
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']
    
    def __str__(self):
        return f"{self.document.title} v{self.version_number}"
    
    def save(self, *args, **kwargs):
        # Enforce immutability
        if self.pk and DocumentVersion.objects.filter(pk=self.pk).exists():
            raise Exception("Document versions are immutable and cannot be modified.")
        
        # Auto-increment version number
        if not self.version_number:
            last_version = DocumentVersion.objects.filter(document=self.document).order_by('-version_number').first()
            self.version_number = (last_version.version_number + 1) if last_version else 1
        
        # Calculate file hash if not provided
        if self.file and not self.file_hash:
            self.file_hash = self._calculate_file_hash()
        
        super().save(*args, **kwargs)
        
        # Update document's current version
        self.document.current_version = self
        self.document.save(update_fields=['current_version', 'updated_at'])
    
    def _calculate_file_hash(self):
        """Calculate SHA-256 hash of the file."""
        sha256 = hashlib.sha256()
        for chunk in self.file.chunks():
            sha256.update(chunk)
        return sha256.hexdigest()


class ApprovalWorkflow(models.Model):
    """
    Tracks the approval workflow for a document.
    Created when document is submitted for review.
    """
    
    class WorkflowStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        VALIDATED = 'VALIDATED', 'Validated (Awaiting Final)'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name='workflow'
    )
    status = models.CharField(
        max_length=20,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.PENDING
    )
    
    # Tracking
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='initiated_workflows'
    )
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Deadline for SLA tracking
    deadline = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-initiated_at']
    
    def __str__(self):
        return f"Workflow for {self.document.title} - {self.status}"


class ApprovalStep(models.Model):
    """
    Individual approval/review action within a workflow.
    Immutable after completion.
    """
    
    class Action(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        VALIDATED = 'VALIDATED', 'Validated'
        REJECTED = 'REJECTED', 'Rejected'
        REVISION_REQUESTED = 'REVISION_REQUESTED', 'Revision Requested'
    
    class StepType(models.TextChoices):
        PMNC_REVIEW = 'PMNC_REVIEW', 'PMNC Review'
        SPV_APPROVAL = 'SPV_APPROVAL', 'SPV Final Approval'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        ApprovalWorkflow,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_type = models.CharField(max_length=20, choices=StepType.choices)
    step_order = models.PositiveIntegerField()
    
    # Required role for this step
    role_required = models.CharField(max_length=50)
    
    # Action taken
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        default=Action.PENDING
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approval_actions'
    )
    acted_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    
    class Meta:
        ordering = ['step_order']
        unique_together = ['workflow', 'step_order']
    
    def __str__(self):
        return f"{self.step_type} - {self.action}"


class DocumentAuditLog(models.Model):
    """
    Immutable audit trail for all document actions.
    Supports government compliance and RTI requirements.
    """
    
    class Action(models.TextChoices):
        UPLOAD = 'UPLOAD', 'Document Uploaded'
        VERSION_CREATED = 'VERSION_CREATED', 'New Version Created'
        VIEW = 'VIEW', 'Document Viewed'
        DOWNLOAD = 'DOWNLOAD', 'Document Downloaded'
        MOVED = 'MOVED', 'Document Moved'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'
        SUBMITTED_FOR_REVIEW = 'SUBMITTED_FOR_REVIEW', 'Submitted for Review'
        VALIDATED = 'VALIDATED', 'Validated by PMNC'
        APPROVED = 'APPROVED', 'Final Approval'
        REJECTED = 'REJECTED', 'Rejected'
        REVISION_REQUESTED = 'REVISION_REQUESTED', 'Revision Requested'
        ARCHIVED = 'ARCHIVED', 'Archived'
        FOLDER_CREATED = 'FOLDER_CREATED', 'Folder Created'
        FOLDER_MOVED = 'FOLDER_MOVED', 'Folder Moved'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Actor
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='edms_audit_logs'
    )
    actor_role = models.CharField(max_length=50)
    
    # Action
    action = models.CharField(max_length=30, choices=Action.choices)
    
    # Resource (generic to support documents and folders)
    resource_type = models.CharField(max_length=50)  # 'Document', 'Folder', 'Version'
    resource_id = models.UUIDField()
    
    # Details
    details = models.JSONField(default=dict, help_text="Additional context about the action")
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['actor', 'action']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.actor} - {self.action} - {self.resource_type}:{self.resource_id}"
    
    def save(self, *args, **kwargs):
        # Enforce immutability
        if self.pk and DocumentAuditLog.objects.filter(pk=self.pk).exists():
            raise Exception("Audit logs are immutable and cannot be modified.")
        super().save(*args, **kwargs)


class NotingSheet(models.Model):
    """
    Immutable Noting Sheet Entry - Official record of observations, decisions, and rulings.
    
    Features:
    - Write-once-read-forever (immutable after submission)
    - Linked to document and optionally to specific version/workflow
    - Sequential numbering per document
    - Role-based access control
    - Rulings can trigger document status changes
    
    Complies with audit, RTI, and CAG requirements.
    """
    
    class NoteType(models.TextChoices):
        REMARK = 'REMARK', 'Remark/Observation'
        CLARIFICATION_REQUEST = 'CLARIFICATION_REQUEST', 'Clarification Request'
        CLARIFICATION_RESPONSE = 'CLARIFICATION_RESPONSE', 'Clarification Response'
        RECOMMENDATION = 'RECOMMENDATION', 'Recommendation'
        RULING = 'RULING', 'Decision/Ruling'  # Triggers status change
    
    class RulingAction(models.TextChoices):
        """Actions that can be taken in a RULING note."""
        NONE = 'NONE', 'None'
        VALIDATE = 'VALIDATE', 'Validate Document'
        APPROVE = 'APPROVE', 'Approve Document'
        REJECT = 'REJECT', 'Reject Document'
        REQUEST_REVISION = 'REQUEST_REVISION', 'Request Revision'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Context - what this note is about
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='notings'
    )
    document_version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Specific version this note references"
    )
    workflow = models.ForeignKey(
        ApprovalWorkflow,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Linked approval workflow"
    )
    
    # Note identification
    note_number = models.PositiveIntegerField(
        help_text="Sequential number within document"
    )
    note_type = models.CharField(
        max_length=30,
        choices=NoteType.choices,
        default=NoteType.REMARK
    )
    
    # Content
    subject = models.CharField(max_length=500, blank=True)
    content = models.TextField()
    
    # Page/location reference (for PDF viewer integration)
    page_reference = models.JSONField(
        null=True,
        blank=True,
        help_text="Page and coordinate reference: {'page': 3, 'coords': [x,y]}"
    )
    
    # Reference to earlier note (for corrections/follow-ups)
    references_note = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referenced_by',
        help_text="Reference to a previous note being corrected or responded to"
    )
    
    # Ruling action (only for RULING type)
    ruling_action = models.CharField(
        max_length=30,
        choices=RulingAction.choices,
        default=RulingAction.NONE,
        help_text="Action to take when ruling is submitted"
    )
    
    # Author information (frozen at creation time)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,  # Cannot delete user with notes
        related_name='noting_entries'
    )
    author_name = models.CharField(max_length=200, help_text="Frozen author name")
    author_role = models.CharField(max_length=50, help_text="Frozen author role")
    author_designation = models.CharField(max_length=200, blank=True, help_text="Official designation")
    
    # Draft/Submit workflow
    is_draft = models.BooleanField(
        default=True,
        help_text="Draft notes are editable, submitted notes are immutable"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when note was finalized"
    )
    
    class Meta:
        ordering = ['note_number']
        unique_together = ['document', 'note_number']
        indexes = [
            models.Index(fields=['document', 'is_draft']),
            models.Index(fields=['author', 'created_at']),
        ]
    
    def __str__(self):
        status = "DRAFT" if self.is_draft else "SUBMITTED"
        return f"Note #{self.note_number} ({self.note_type}) - {status}"
    
    def save(self, *args, **kwargs):
        # Auto-assign note number for new notes
        if not self.note_number:
            from django.db.models import Max
            max_num = NotingSheet.objects.filter(
                document=self.document
            ).aggregate(Max('note_number'))['note_number__max'] or 0
            self.note_number = max_num + 1
        
        # Freeze author details on creation
        if not self.pk:
            self.author_name = self.author.username
            self.author_role = getattr(self.author, 'role', 'Unknown')
            self.author_designation = getattr(self.author, 'designation', '')
        
        # IMMUTABILITY: Once submitted, no changes allowed
        if self.pk:
            original = NotingSheet.objects.filter(pk=self.pk).first()
            if original and not original.is_draft:
                raise Exception(
                    "Submitted noting entries are immutable and cannot be modified. "
                    "Create a new note to add corrections or clarifications."
                )
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Only drafts can be deleted
        if not self.is_draft:
            raise Exception(
                "Submitted noting entries cannot be deleted. "
                "They are permanent legal records."
            )
        super().delete(*args, **kwargs)
    
    def submit(self):
        """
        Submit the note, making it immutable.
        If it's a RULING, also triggers the appropriate document status change.
        """
        from django.utils import timezone
        
        if not self.is_draft:
            raise Exception("Note is already submitted.")
        
        self.is_draft = False
        self.submitted_at = timezone.now()
        self.save()
        
        # Execute ruling action if applicable
        if self.note_type == self.NoteType.RULING and self.ruling_action != self.RulingAction.NONE:
            self._execute_ruling()
    
    def _execute_ruling(self):
        """Execute a ruling action on the document."""
        from .services import WorkflowService
        
        doc = self.document
        action = self.ruling_action
        
        try:
            if action == self.RulingAction.VALIDATE:
                WorkflowService.validate_document(self.author, doc, comments=self.content)
            elif action == self.RulingAction.APPROVE:
                WorkflowService.approve_document(self.author, doc, comments=self.content)
            elif action == self.RulingAction.REJECT:
                WorkflowService.reject_document(self.author, doc, comments=self.content)
            elif action == self.RulingAction.REQUEST_REVISION:
                WorkflowService.request_revision(self.author, doc, comments=self.content)
        except ValueError as e:
            # Status change not applicable in current state
            pass

