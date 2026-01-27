"""
EDMS Views - API Endpoints

Implements:
- Folder CRUD (create, list, move - no delete)
- Document CRUD with version control
- File upload/download
- Workflow actions (submit, validate, approve, reject)
- Audit log access
"""
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .models import (
    Folder, Document, DocumentVersion,
    ApprovalWorkflow, ApprovalStep, DocumentAuditLog, NotingSheet
)
from .serializers import (
    FolderSerializer, FolderTreeSerializer, FolderCreateSerializer,
    DocumentListSerializer, DocumentDetailSerializer, DocumentUploadSerializer,
    DocumentVersionSerializer, DocumentMoveSerializer, VersionUploadSerializer,
    ApprovalWorkflowSerializer, WorkflowActionSerializer,
    DocumentAuditLogSerializer,
    NotingSheetListSerializer, NotingSheetDetailSerializer, NotingSheetCreateSerializer
)
from .permissions import (
    EDMSPermissions, CanUploadDocument, CanCreateFolder,
    CanValidateDocument, CanApproveDocument, CanViewAuditLog
)
from .services import DocumentService, WorkflowService, FolderService, AuditService


class FolderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for folder operations.
    No delete allowed - only create, list, and move.
    """
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Folder.objects.all()
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by parent (for tree building)
        parent_id = self.request.query_params.get('parent')
        if parent_id == 'null' or parent_id == '':
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        return queryset.order_by('name')
    
    def create(self, request, *args, **kwargs):
        """Create a new folder."""
        if not EDMSPermissions.can_create_folder(request.user):
            return Response(
                {'error': f'You do not have permission to create folders. Your role: {getattr(request.user, "role", "Unknown")}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = FolderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from projects.models import Project
            project = Project.objects.get(id=serializer.validated_data['project'])
            parent = None
            if serializer.validated_data.get('parent'):
                parent = Folder.objects.get(id=serializer.validated_data['parent'])
            
            folder = FolderService.create_folder(
                user=request.user,
                project=project,
                name=serializer.validated_data['name'],
                parent=parent,
                request=request
            )
            
            return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=status.HTTP_400_BAD_REQUEST)
        except Folder.DoesNotExist:
            return Response({'error': 'Parent folder not found.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Disable delete."""
        return Response(
            {'error': 'Folder deletion is not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get folder tree for a project."""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        folders = Folder.objects.filter(project_id=project_id, parent__isnull=True)
        serializer = FolderTreeSerializer(folders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def move(self, request, pk=None):
        """Move folder to a new parent."""
        if not EDMSPermissions.can_create_folder(request.user):
            return Response(
                {'error': 'You do not have permission to move folders.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        folder = self.get_object()
        new_parent_id = request.data.get('parent')
        new_parent = None
        
        if new_parent_id:
            new_parent = get_object_or_404(Folder, id=new_parent_id)
        
        folder = FolderService.move_folder(request.user, folder, new_parent, request)
        return Response(FolderSerializer(folder).data)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document operations with version control.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Document.objects.exclude(status=Document.Status.ARCHIVED)
        
        # Role-based filtering
        if not EDMSPermissions.can_view_all(user):
            # Non-admins see only their own uploads + non-confidential docs
            from django.db.models import Q
            queryset = queryset.filter(
                Q(uploaded_by=user) | Q(is_confidential=False)
            )
        elif not EDMSPermissions.can_view_confidential(user):
            queryset = queryset.filter(is_confidential=False)
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by folder
        folder_id = self.request.query_params.get('folder')
        if folder_id == 'null' or folder_id == '':
            queryset = queryset.filter(folder__isnull=True)
        elif folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        # Filter by status
        doc_status = self.request.query_params.get('status')
        if doc_status:
            queryset = queryset.filter(status=doc_status)
        
        # Filter by type
        doc_type = self.request.query_params.get('type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.select_related('folder', 'project', 'uploaded_by', 'current_version')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Upload a new document or add version if exists.
        
        Smart Routing: If 'auto_route_category' is provided, the document is
        automatically filed to the standard folder (e.g., RA_BILL → 04_Financials/RA Bills).
        Falls back to manual 'folder' selection if not provided.
        """
        if not EDMSPermissions.can_upload(request.user):
            return Response(
                {'error': 'You do not have permission to upload documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            print("Document upload validation errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from projects.models import Project
            project = Project.objects.get(id=serializer.validated_data['project'])
            
            # Smart Routing: Determine target folder
            folder = None
            auto_route_category = serializer.validated_data.get('auto_route_category')
            
            if auto_route_category:
                # Use DirectoryService to get the correct folder
                from edms.services.directory_service import DirectoryService
                import logging
                logger = logging.getLogger(__name__)
                
                logger.info(f"Smart routing document to category: {auto_route_category}")
                folder = DirectoryService.get_route_folder(
                    project=project,
                    route_category=auto_route_category,
                    created_by=request.user
                )
                logger.info(f"Document routed to folder: {folder.name if folder else 'None'}")
            elif serializer.validated_data.get('folder'):
                # Fallback to manual folder selection
                folder = Folder.objects.get(id=serializer.validated_data['folder'])
            
            # Use smart upload/version detection
            document = DocumentService.upload_or_version_document(
                user=request.user,
                project=project,
                file=serializer.validated_data['file'],
                title=serializer.validated_data.get('title'),  # May be None
                document_type=serializer.validated_data.get('document_type'),
                folder=folder,
                description=serializer.validated_data.get('description', ''),
                change_notes=serializer.validated_data.get('change_notes', ''),
                is_confidential=serializer.validated_data.get('is_confidential', False),
                metadata=serializer.validated_data.get('metadata', {}),
                request=request
            )
            
            # Auto-submit for approval (mandatory workflow)
            try:
                workflow = WorkflowService.submit_for_review(
                    user=request.user,
                    document=document,
                    request=request
                )
            except Exception as e:
                # If workflow already exists or submission fails, log but continue
                print(f"Workflow submission note: {e}")
            
            document.refresh_from_db()
            
            return Response(
                DocumentDetailSerializer(document, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def retrieve(self, request, *args, **kwargs):
        """Get document details and log view."""
        document = self.get_object()
        
        # Log view
        DocumentService.log_view(request.user, document, request)
        
        serializer = DocumentDetailSerializer(document, context={'request': request})
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Disable delete - use archive instead."""
        return Response(
            {'error': 'Document deletion is not allowed. Use archive instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_version(self, request, pk=None):
        """Upload a new version of the document."""
        document = self.get_object()
        
        if not EDMSPermissions.can_edit_document(request.user, document):
            return Response(
                {'error': 'You cannot upload a new version of this document.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = VersionUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            version = DocumentService.create_new_version(
                user=request.user,
                document=document,
                file=serializer.validated_data['file'],
                change_notes=serializer.validated_data.get('change_notes', ''),
                request=request
            )
            
            # Auto-submit for approval (mandatory workflow)
            document.refresh_from_db()
            try:
                workflow = WorkflowService.submit_for_review(
                    user=request.user,
                    document=document,
                    request=request
                )
            except Exception as e:
                # If workflow already exists, log but continue
                print(f"Workflow submission note: {e}")
            
            document.refresh_from_db()
            
            return Response(
                DocumentVersionSerializer(version, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get version history."""
        document = self.get_object()
        versions = document.versions.all()
        serializer = DocumentVersionSerializer(versions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the current version of the document."""
        document = self.get_object()
        version = document.current_version
        
        if not version or not version.file:
            return Response(
                {'error': 'No file available for download.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download
        DocumentService.log_download(request.user, document, version, request)
        
        response = FileResponse(
            version.file.open('rb'),
            content_type=version.mime_type
        )
        response['Content-Disposition'] = f'attachment; filename="{version.file_name}"'
        return response
    
    @action(detail=True, methods=['get'], url_path='versions/(?P<version_id>[^/.]+)/download')
    def download_version(self, request, pk=None, version_id=None):
        """Download a specific version."""
        document = self.get_object()
        version = get_object_or_404(DocumentVersion, id=version_id, document=document)
        
        if not version.file:
            return Response(
                {'error': 'No file available for download.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download
        DocumentService.log_download(request.user, document, version, request)
        
        response = FileResponse(
            version.file.open('rb'),
            content_type=version.mime_type
        )
        response['Content-Disposition'] = f'attachment; filename="{version.file_name}"'
        return response
    
    @action(detail=True, methods=['patch'])
    def move(self, request, pk=None):
        """Move document to a different folder."""
        if not EDMSPermissions.can_move_document(request.user):
            return Response(
                {'error': 'You do not have permission to move documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        serializer = DocumentMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        folder = None
        if serializer.validated_data.get('folder'):
            folder = Folder.objects.get(id=serializer.validated_data['folder'])
        
        document = DocumentService.move_document(request.user, document, folder, request)
        return Response(DocumentDetailSerializer(document, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        """Submit document for PMNC review."""
        document = self.get_object()
        
        try:
            workflow = WorkflowService.submit_for_review(request.user, document, request)
            document.refresh_from_db()
            return Response(DocumentDetailSerializer(document, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], parser_classes=[parsers.JSONParser])
    def validate(self, request, pk=None):
        """PMNC validates the document."""
        if not EDMSPermissions.can_validate(request.user):
            return Response(
                {'error': 'You do not have permission to validate documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            document = WorkflowService.validate_document(
                request.user, document,
                comments=serializer.validated_data.get('comments', ''),
                request=request
            )
            return Response(DocumentDetailSerializer(document, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], parser_classes=[parsers.JSONParser])
    def request_revision(self, request, pk=None):
        """Request revision from uploader."""
        if not EDMSPermissions.can_validate(request.user):
            return Response(
                {'error': 'You do not have permission to request revisions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comments = serializer.validated_data.get('comments', '')
        if not comments:
            return Response(
                {'error': 'Comments are required when requesting revision.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            document = WorkflowService.request_revision(
                request.user, document, comments, request
            )
            return Response(DocumentDetailSerializer(document, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], parser_classes=[parsers.JSONParser])
    def approve(self, request, pk=None):
        """SPV final approval."""
        if not EDMSPermissions.can_approve(request.user):
            return Response(
                {'error': 'You do not have permission for final approval.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            document = WorkflowService.approve_document(
                request.user, document,
                comments=serializer.validated_data.get('comments', ''),
                request=request
            )
            return Response(DocumentDetailSerializer(document, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], parser_classes=[parsers.JSONParser])
    def reject(self, request, pk=None):
        """SPV rejects the document."""
        if not EDMSPermissions.can_approve(request.user):
            return Response(
                {'error': 'You do not have permission to reject documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comments = serializer.validated_data.get('comments', '')
        if not comments:
            return Response(
                {'error': 'Comments are required when rejecting a document.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            document = WorkflowService.reject_document(
                request.user, document, comments, request
            )
            return Response(DocumentDetailSerializer(document, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a document (soft delete)."""
        if not EDMSPermissions.can_archive(request.user):
            return Response(
                {'error': 'You do not have permission to archive documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        document.status = Document.Status.ARCHIVED
        document.save(update_fields=['status', 'updated_at'])
        
        AuditService.log(
            actor=request.user,
            action=DocumentAuditLog.Action.ARCHIVED,
            resource_type='Document',
            resource_id=document.id,
            request=request
        )
        
        return Response({'status': 'Document archived successfully.'})
    
    @action(detail=True, methods=['post'], url_path='versions/(?P<version_number>[0-9]+)/restore')
    def restore_version(self, request, pk=None, version_number=None):
        """
        Restore an older version by creating a new version from it.
        Government compliance: Rollback capability without destroying history.
        """
        document = self.get_object()
        
        if not EDMSPermissions.can_edit_document(request.user, document):
            return Response(
                {'error': 'You do not have permission to restore versions of this document.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            version_number_int = int(version_number)
            new_version = DocumentService.restore_version(
                user=request.user,
                document=document,
                version_number=version_number_int,
                request=request
            )
            
            document.refresh_from_db()
            return Response(
                {
                    'message': f'Version {version_number_int} restored successfully as version {new_version.version_number}',
                    'document': DocumentDetailSerializer(document, context={'request': request}).data
                },
                status=status.HTTP_200_OK
            )
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='versions/compare')
    def compare_versions(self, request, pk=None):
        """
        Compare two versions of a document.
        Query params: version_a, version_b (version numbers)
        """
        document = self.get_object()
        
        version_a = request.query_params.get('version_a')
        version_b = request.query_params.get('version_b')
        
        if not version_a or not version_b:
            return Response(
                {'error': 'Both version_a and version_b query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            version_a_int = int(version_a)
            version_b_int = int(version_b)
            
            comparison = DocumentService.compare_versions(
                document=document,
                version_a_number=version_a_int,
                version_b_number=version_b_int
            )
            
            return Response(comparison, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing approvals and pending items.
    """
    serializer_class = ApprovalWorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ApprovalWorkflow.objects.exclude(
            status=ApprovalWorkflow.WorkflowStatus.CANCELLED
        ).select_related('document', 'initiated_by').prefetch_related('steps')
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get documents pending action from current user."""
        documents = WorkflowService.get_pending_approvals(request.user)
        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only access to audit logs (SPV/NICDC only).
    """
    serializer_class = DocumentAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewAuditLog]
    
    def get_queryset(self):
        queryset = DocumentAuditLog.objects.all()
        
        # Filter by document
        document_id = self.request.query_params.get('document')
        if document_id:
            queryset = queryset.filter(resource_type='Document', resource_id=document_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by actor
        actor_id = self.request.query_params.get('actor')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset.select_related('actor')


class NotingSheetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Noting Sheet operations.
    
    Supports:
    - List notes for a document
    - Create draft notes
    - Submit notes (makes them immutable)
    - No update/delete for submitted notes
    """
    serializer_class = NotingSheetListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .models import NotingSheet
        user = self.request.user
        queryset = NotingSheet.objects.all()
        
        # Filter drafts - users can only see their own drafts
        if not self.request.query_params.get('include_drafts'):
            # Hide other users' drafts
            from django.db.models import Q
            queryset = queryset.filter(Q(is_draft=False) | Q(author=user))
        
        # Filter by document (primary use case)
        document_id = self.request.query_params.get('document')
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        
        # Filter by type
        note_type = self.request.query_params.get('type')
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        
        # Filter by author
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
        
        return queryset.select_related('author', 'document', 'document_version')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotingSheetListSerializer
        if self.action == 'create':
            return NotingSheetCreateSerializer
        return NotingSheetDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new noting entry (draft by default)."""
        from .models import NotingSheet, Document, DocumentVersion
        
        serializer = NotingSheetCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        note_type = data['note_type']
        
        # Permission check based on note type
        if not EDMSPermissions.can_add_noting(request.user, note_type):
            return Response(
                {'error': f'You do not have permission to add {note_type} notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            document = Document.objects.get(id=data['document'])
            document_version = None
            if data.get('document_version'):
                document_version = DocumentVersion.objects.get(id=data['document_version'])
            
            references_note = None
            if data.get('references_note'):
                references_note = NotingSheet.objects.get(id=data['references_note'])
            
            note = NotingSheet.objects.create(
                document=document,
                document_version=document_version,
                note_type=note_type,
                subject=data.get('subject', ''),
                content=data['content'],
                page_reference=data.get('page_reference'),
                references_note=references_note,
                ruling_action=data.get('ruling_action', 'NONE'),
                author=request.user,
                is_draft=data.get('is_draft', True)
            )
            
            # If not draft, submit immediately
            if not data.get('is_draft', True):
                note.submit()
            
            return Response(
                NotingSheetDetailSerializer(note).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """Only allow updating drafts."""
        note = self.get_object()
        if not note.is_draft:
            return Response(
                {'error': 'Submitted notes are immutable and cannot be modified.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if note.author != request.user:
            return Response(
                {'error': 'You can only edit your own draft notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only allow deleting drafts."""
        note = self.get_object()
        if not note.is_draft:
            return Response(
                {'error': 'Submitted notes cannot be deleted. They are permanent legal records.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if note.author != request.user:
            return Response(
                {'error': 'You can only delete your own draft notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit a draft note, making it immutable."""
        note = self.get_object()
        
        if note.author != request.user:
            return Response(
                {'error': 'You can only submit your own notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not note.is_draft:
            return Response(
                {'error': 'Note is already submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            note.submit()
            return Response(NotingSheetDetailSerializer(note).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Export all notes for a document as PDF."""
        from django.http import HttpResponse
        from .models import NotingSheet
        
        document_id = request.query_params.get('document')
        if not document_id:
            return Response(
                {'error': 'document parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notes = NotingSheet.objects.filter(
            document_id=document_id,
            is_draft=False
        ).order_by('note_number')
        
        if not notes.exists():
            return Response(
                {'error': 'No submitted notes found for this document.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate simple text/HTML for now - can be enhanced with proper PDF library
        document = notes.first().document
        content = f"""
        <html>
        <head>
            <title>Noting Sheet - {document.title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }}
                .note {{ border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }}
                .note-header {{ display: flex; justify-content: space-between; margin-bottom: 10px; }}
                .note-number {{ font-weight: bold; font-size: 1.2em; }}
                .note-type {{ background: #e0e0e0; padding: 2px 8px; border-radius: 3px; }}
                .note-meta {{ color: #666; font-size: 0.9em; }}
                .note-content {{ margin-top: 10px; }}
                .ruling {{ border-left: 4px solid #4CAF50; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>NOTING SHEET</h1>
                <p><strong>Document:</strong> {document.title}</p>
                <p><strong>Document Number:</strong> {document.document_number or 'N/A'}</p>
                <p><strong>Status:</strong> {document.status}</p>
            </div>
        """
        
        for note in notes:
            ruling_class = 'ruling' if note.note_type == 'RULING' else ''
            content += f"""
            <div class="note {ruling_class}">
                <div class="note-header">
                    <span class="note-number">Note #{note.note_number}</span>
                    <span class="note-type">{note.get_note_type_display()}</span>
                </div>
                <div class="note-meta">
                    <strong>{note.author_name}</strong> ({note.author_role})
                    {f'- {note.author_designation}' if note.author_designation else ''}
                    <br>
                    Submitted: {note.submitted_at.strftime('%d %b %Y, %H:%M') if note.submitted_at else 'N/A'}
                </div>
                {f'<p><strong>Subject:</strong> {note.subject}</p>' if note.subject else ''}
                <div class="note-content">{note.content}</div>
                {f'<p><em>Ruling Action: {note.get_ruling_action_display()}</em></p>' if note.ruling_action != 'NONE' else ''}
            </div>
            """
        
        content += "</body></html>"
        
        response = HttpResponse(content, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="noting_sheet_{document_id}.html"'
        return response

