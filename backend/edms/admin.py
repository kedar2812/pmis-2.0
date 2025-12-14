from django.contrib import admin
from .models import Folder, Document, DocumentVersion, ApprovalWorkflow, ApprovalStep, DocumentAuditLog, NotingSheet


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'parent', 'created_by', 'created_at']
    list_filter = ['project', 'created_at']
    search_fields = ['name']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'document_type', 'status', 'project', 'uploaded_by', 'created_at']
    list_filter = ['status', 'document_type', 'project', 'is_confidential']
    search_fields = ['title', 'description', 'document_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ['document', 'version_number', 'file_name', 'uploaded_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['document__title', 'file_name']
    readonly_fields = ['id', 'version_number', 'file_hash', 'created_at']


@admin.register(ApprovalWorkflow)
class ApprovalWorkflowAdmin(admin.ModelAdmin):
    list_display = ['document', 'status', 'initiated_by', 'initiated_at', 'deadline']
    list_filter = ['status', 'initiated_at']


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'step_type', 'step_order', 'action', 'actor', 'acted_at']
    list_filter = ['step_type', 'action']


@admin.register(DocumentAuditLog)
class DocumentAuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'resource_type', 'timestamp']
    list_filter = ['action', 'resource_type', 'timestamp']
    search_fields = ['actor__username']
    readonly_fields = ['id', 'timestamp']


@admin.register(NotingSheet)
class NotingSheetAdmin(admin.ModelAdmin):
    list_display = ['note_number', 'note_type', 'document', 'author_name', 'is_draft', 'created_at', 'submitted_at']
    list_filter = ['note_type', 'is_draft', 'created_at', 'ruling_action']
    search_fields = ['content', 'subject', 'author_name']
    readonly_fields = ['id', 'note_number', 'author_name', 'author_role', 'author_designation', 'created_at', 'submitted_at']
    raw_id_fields = ['document', 'document_version', 'workflow', 'author', 'references_note']

