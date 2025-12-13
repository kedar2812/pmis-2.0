from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.utils.translation import gettext_lazy as _
import uuid

class Document(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SUBMITTED = 'SUBMITTED', _('Submitted')
        UNDER_REVIEW = 'UNDER_REVIEW', _('Under Review')
        CLARIFICATION_REQ = 'CLARIFICATION_REQ', _('Clarification Required')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')
        ARCHIVED = 'ARCHIVED', _('Archived')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='documents')
    
    # Optional package link (if packages module exists, otherwise char field or null)
    # Using CharField for flexibility if Package model isn't strictly defined yet, or loose coupling
    package_id = models.CharField(max_length=100, blank=True, null=True, help_text="Reference to Work Package ID")
    
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, help_text="e.g., Drawing, Invoice, Report")
    
    current_version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    
    # Security & Integrity
    s3_key = models.CharField(max_length=1024, help_text="Path in Object Store")
    file_hash = models.CharField(max_length=64, help_text="SHA-256 Checksum", db_index=True)
    
    # Metadata with GIN Index for fast search
    metadata = models.JSONField(default=dict, blank=True, help_text="Dynamic fields like Drawing No, Amount")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            GinIndex(fields=['metadata'], name='edms_metadata_gin'),
            models.Index(fields=['status']),
            models.Index(fields=['project']),
        ]
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} (v{self.current_version})"


class DocumentVersion(models.Model):
    """
    Immutable history of document versions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    
    s3_key = models.CharField(max_length=1024)
    file_hash = models.CharField(max_length=64)
    
    uploaded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    change_remarks = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'version_number')
        ordering = ['-version_number']


class NotingSheet(models.Model):
    """
    The 'Green Sheet' logic. Immutable remarks.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='notings')
    
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    role = models.CharField(max_length=100, help_text="Role of the user at the time of noting")
    
    remark_text = models.TextField()
    is_ruling = models.BooleanField(default=False, help_text="Did this remark change the document status?")
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        
    def save(self, *args, **kwargs):
        if self.pk and NotingSheet.objects.filter(pk=self.pk).exists():
            raise Exception("NotingSheet is immutable and cannot be edited.")
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    class Action(models.TextChoices):
        VIEW = 'VIEW', 'Viewed'
        DOWNLOAD = 'DOWNLOAD', 'Downloaded'
        UPLOAD = 'UPLOAD', 'Uploaded'
        STATUS_CHANGE = 'STATUS_CHANGE', 'Changed Status'
        DELETE = 'DELETE', 'Deleted' # Admin only

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, choices=Action.choices)
    
    resource_id = models.CharField(max_length=255, help_text="ID of the Document or resource")
    details = models.JSONField(default=dict, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
