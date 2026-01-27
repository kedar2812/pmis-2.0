"""
EDMS Serializers - API Data Transformation
"""
from rest_framework import serializers
from .models import (
    Folder, Document, DocumentVersion,
    ApprovalWorkflow, ApprovalStep, DocumentAuditLog
)


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model."""
    created_by_name = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    subfolder_count = serializers.SerializerMethodField()
    full_path = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'project', 'parent', 'created_by', 'created_by_name',
            'created_at', 'document_count', 'subfolder_count', 'full_path'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None
    
    def get_document_count(self, obj):
        return obj.documents.count()
    
    def get_subfolder_count(self, obj):
        return obj.subfolders.count()
    
    def get_full_path(self, obj):
        return obj.get_full_path()


class FolderTreeSerializer(serializers.ModelSerializer):
    """Recursive serializer for folder tree view."""
    children = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = ['id', 'name', 'children', 'document_count']
    
    def get_children(self, obj):
        children = obj.subfolders.all()
        return FolderTreeSerializer(children, many=True).data
    
    def get_document_count(self, obj):
        return obj.documents.count()


class DocumentVersionSerializer(serializers.ModelSerializer):
    """Serializer for DocumentVersion model."""
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'version_number', 'file', 'file_url', 'file_name', 
            'file_size', 'file_size_display', 'file_hash', 'mime_type',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'change_notes'
        ]
        read_only_fields = ['id', 'version_number', 'file_hash', 'created_at']
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.username
        return None
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        return f"{size / (1024 * 1024 * 1024):.1f} GB"


class ApprovalStepSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalStep model."""
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ApprovalStep
        fields = [
            'id', 'step_type', 'step_order', 'role_required',
            'action', 'actor', 'actor_name', 'acted_at', 'comments'
        ]
        read_only_fields = ['id', 'step_type', 'step_order', 'role_required']
    
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.username
        return None


class ApprovalWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalWorkflow with nested steps."""
    steps = ApprovalStepSerializer(many=True, read_only=True)
    initiated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ApprovalWorkflow
        fields = [
            'id', 'status', 'initiated_by', 'initiated_by_name',
            'initiated_at', 'completed_at', 'deadline', 'steps'
        ]
        read_only_fields = fields
    
    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return obj.initiated_by.username
        return None


class DocumentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for document list views."""
    uploaded_by_name = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()
    current_version_number = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'document_type', 'document_number', 'status',
            'is_confidential', 'folder', 'folder_name', 'project', 'project_name',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
            'version_count', 'current_version_number'
        ]
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.username
        return None
    
    def get_version_count(self, obj):
        return obj.versions.count()
    
    def get_current_version_number(self, obj):
        if obj.current_version:
            return obj.current_version.version_number
        return 0
    
    def get_folder_name(self, obj):
        if obj.folder:
            return obj.folder.name
        return 'Root'
    
    def get_project_name(self, obj):
        if obj.project:
            return obj.project.name
        return None


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for document detail view."""
    uploaded_by_name = serializers.SerializerMethodField()
    current_version = DocumentVersionSerializer(read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    workflow = ApprovalWorkflowSerializer(read_only=True)
    folder_path = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'document_type', 'document_number',
            'status', 'is_confidential', 'tags', 'metadata',
            'folder', 'folder_path', 'project', 'project_name',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
            'current_version', 'versions', 'workflow', 'can_edit'
        ]
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.username
        return None
    
    def get_folder_path(self, obj):
        if obj.folder:
            return obj.folder.get_full_path()
        return '/'
    
    def get_project_name(self, obj):
        if obj.project:
            return obj.project.name
        return None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_be_edited_by(request.user)
        return False


class DocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for document upload with smart versioning and auto-routing support.
    
    Auto-routing: If `auto_route_category` is provided, the document will be
    automatically filed to the corresponding standard folder (e.g., RA_BILL → 04_Financials/RA Bills).
    If not provided, falls back to manual `folder` selection.
    """
    title = serializers.CharField(max_length=500, required=False, allow_blank=True)  # Optional - will use filename if not provided
    description = serializers.CharField(required=False, allow_blank=True)
    document_type = serializers.ChoiceField(
        choices=Document.DocumentType.choices,
        required=False,  # Optional - will default to OTHER
        default=Document.DocumentType.OTHER
    )
    document_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    file = serializers.FileField()
    project = serializers.IntegerField()  # Changed from UUID - projects use bigint ID
    folder = serializers.UUIDField(required=False, allow_null=True)
    is_confidential = serializers.BooleanField(default=False)
    metadata = serializers.JSONField(required=False, default=dict)
    change_notes = serializers.CharField(required=False, allow_blank=True)  # For version updates
    
    # Smart Routing: Auto-file to standard folder based on category
    auto_route_category = serializers.ChoiceField(
        choices=[
            ('ADMIN_APPROVAL', 'Admin Approval'),
            ('DPR', 'Detailed Project Report'),
            ('FEASIBILITY', 'Feasibility Report'),
            ('SITE_SURVEY', 'Site Survey'),
            ('ENV_CLEARANCE', 'Environmental Clearance'),
            ('TENDER', 'Tender Document'),
            ('AGREEMENT', 'Agreement/Contract'),
            ('WORK_ORDER', 'Work Order'),
            ('LOA', 'Letter of Award'),
            ('TENDER_EVALUATION', 'Tender Evaluation'),
            ('DRAWING', 'Drawing'),
            ('BOQ', 'Bill of Quantities'),
            ('TECH_SPEC', 'Technical Specification'),
            ('AS_BUILT', 'As-Built Drawing'),
            ('RA_BILL', 'Running Account Bill'),
            ('INVOICE', 'Tax Invoice'),
            ('PAYMENT_ADVICE', 'Payment Advice'),
            ('BUDGET', 'Budget Estimate'),
            ('FINAL_BILL', 'Final Bill'),
            ('FUNDING_PROOF', 'Fund Sanction Order'),
            ('DAILY_REPORT', 'Daily Progress Report'),
            ('SITE_PHOTO', 'Site Photograph'),
            ('INSPECTION', 'Inspection Report'),
            ('RISK_EVIDENCE', 'Risk Evidence'),
            ('QUALITY_REPORT', 'Quality Report'),
            ('SAFETY_REPORT', 'Safety Report'),
            ('INSURANCE', 'Insurance Document'),
            ('BANK_GUARANTEE', 'Bank Guarantee'),
            ('NOTICE', 'Notice'),
            ('NOC', 'No Objection Certificate'),
            ('LICENSE', 'License/Permit'),
            ('CORRESPONDENCE_IN', 'Incoming Correspondence'),
            ('CORRESPONDENCE_OUT', 'Outgoing Correspondence'),
            ('MEETING_MINUTES', 'Meeting Minutes'),
            ('OTHER', 'Other/Miscellaneous'),
        ],
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Auto-route to standard folder based on category. Overrides 'folder' if provided."
    )
    
    def validate_project(self, value):
        from projects.models import Project
        try:
            Project.objects.get(id=value)
        except Project.DoesNotExist:
            raise serializers.ValidationError("Project not found.")
        return value
    
    def validate_folder(self, value):
        if value:
            try:
                Folder.objects.get(id=value)
            except Folder.DoesNotExist:
                raise serializers.ValidationError("Folder not found.")
        return value


class DocumentMoveSerializer(serializers.Serializer):
    """Serializer for moving a document."""
    folder = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_folder(self, value):
        if value:
            try:
                Folder.objects.get(id=value)
            except Folder.DoesNotExist:
                raise serializers.ValidationError("Target folder not found.")
        return value


class VersionUploadSerializer(serializers.Serializer):
    """Serializer for uploading a new version."""
    file = serializers.FileField()
    change_notes = serializers.CharField(required=False, allow_blank=True)


class WorkflowActionSerializer(serializers.Serializer):
    """Serializer for workflow actions (approve, reject, request revision)."""
    comments = serializers.CharField(required=False, allow_blank=True)


class DocumentAuditLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for audit logs."""
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentAuditLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_role', 'action',
            'resource_type', 'resource_id', 'details',
            'ip_address', 'timestamp'
        ]
        read_only_fields = fields
    
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.username
        return 'System'


class FolderCreateSerializer(serializers.Serializer):
    """Serializer for creating a folder."""
    name = serializers.CharField(max_length=255)
    project = serializers.UUIDField()
    parent = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_project(self, value):
        from projects.models import Project
        try:
            Project.objects.get(id=value)
        except Project.DoesNotExist:
            raise serializers.ValidationError("Project not found.")
        return value
    
    def validate_parent(self, value):
        if value:
            try:
                Folder.objects.get(id=value)
            except Folder.DoesNotExist:
                raise serializers.ValidationError("Parent folder not found.")
        return value


# =========================================
# NOTING SHEET SERIALIZERS
# =========================================

class NotingSheetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for noting sheet list."""
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    ruling_action_display = serializers.CharField(source='get_ruling_action_display', read_only=True)
    
    class Meta:
        from .models import NotingSheet
        model = NotingSheet
        fields = [
            'id', 'note_number', 'note_type', 'note_type_display',
            'subject', 'content', 'is_draft',
            'author_name', 'author_role', 'author_designation',
            'ruling_action', 'ruling_action_display',
            'created_at', 'submitted_at',
            'references_note', 'page_reference'
        ]


class NotingSheetDetailSerializer(serializers.ModelSerializer):
    """Full serializer for noting sheet detail."""
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    ruling_action_display = serializers.CharField(source='get_ruling_action_display', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_version_number = serializers.SerializerMethodField()
    referenced_by = NotingSheetListSerializer(many=True, read_only=True)
    
    class Meta:
        from .models import NotingSheet
        model = NotingSheet
        fields = [
            'id', 'note_number', 'note_type', 'note_type_display',
            'subject', 'content', 'is_draft',
            'document', 'document_title',
            'document_version', 'document_version_number',
            'workflow',
            'author', 'author_name', 'author_role', 'author_designation',
            'ruling_action', 'ruling_action_display',
            'page_reference', 'references_note', 'referenced_by',
            'created_at', 'submitted_at'
        ]
        read_only_fields = [
            'id', 'note_number', 'author_name', 'author_role', 'author_designation',
            'created_at', 'submitted_at'
        ]
    
    def get_document_version_number(self, obj):
        if obj.document_version:
            return obj.document_version.version_number
        return None


class NotingSheetCreateSerializer(serializers.Serializer):
    """Serializer for creating a noting sheet entry."""
    from .models import NotingSheet
    
    document = serializers.UUIDField()
    document_version = serializers.UUIDField(required=False, allow_null=True)
    note_type = serializers.ChoiceField(choices=NotingSheet.NoteType.choices)
    subject = serializers.CharField(max_length=500, required=False, allow_blank=True)
    content = serializers.CharField()
    page_reference = serializers.JSONField(required=False, allow_null=True)
    references_note = serializers.UUIDField(required=False, allow_null=True)
    ruling_action = serializers.ChoiceField(
        choices=NotingSheet.RulingAction.choices,
        required=False,
        default='NONE'
    )
    is_draft = serializers.BooleanField(default=True)
    
    def validate_document(self, value):
        from .models import Document
        try:
            Document.objects.get(id=value)
        except Document.DoesNotExist:
            raise serializers.ValidationError("Document not found.")
        return value
    
    def validate_document_version(self, value):
        if value:
            from .models import DocumentVersion
            try:
                DocumentVersion.objects.get(id=value)
            except DocumentVersion.DoesNotExist:
                raise serializers.ValidationError("Document version not found.")
        return value
    
    def validate_references_note(self, value):
        if value:
            from .models import NotingSheet
            try:
                NotingSheet.objects.get(id=value)
            except NotingSheet.DoesNotExist:
                raise serializers.ValidationError("Referenced note not found.")
        return value
    
    def validate(self, data):
        # Ruling action only allowed for RULING type
        if data.get('ruling_action') != 'NONE' and data.get('note_type') != 'RULING':
            raise serializers.ValidationError({
                'ruling_action': 'Ruling action can only be set for RULING type notes.'
            })
        return data

