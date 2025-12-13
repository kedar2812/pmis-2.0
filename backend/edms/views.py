from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Document, NotingSheet, AuditLog
from .serializers import (
    DocumentSerializer, DocumentCreateSerializer, 
    NotingSheetSerializer, AuditLogSerializer
)
from .services import WorkflowService, StorageService, VersioningService

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentCreateSerializer
        return DocumentSerializer

    def get_queryset(self):
        """
        Filter documents by project or permissions.
        """
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # TODO: Add specific role-based filtering (e.g. Contractor sees only their docs)
        return queryset

    def perform_create(self, serializer):
        """
        Handle file upload and initial creation.
        """
        file_obj = serializer.validated_data.pop('file')
        
        # 1. Upload to Storage
        # Generate a unique key path: projects/{project_id}/edms/{filename}
        # In reality, use UUID or safer naming
        project_id = serializer.validated_data['project'].id
        file_path = f"projects/{project_id}/edms/{file_obj.name}"
        
        saved_path, file_hash = StorageService.upload_file(file_obj, file_path)
        
        # 2. Save Document Record
        document = serializer.save(
            s3_key=saved_path,
            file_hash=file_hash,
            status=Document.Status.DRAFT  # Initial status
        )
        
        # 3. Audit Log
        AuditLog.objects.create(
            actor=self.request.user,
            action=AuditLog.Action.UPLOAD,
            resource_id=str(document.id),
            details={'filename': file_obj.name, 'size': file_obj.size},
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        return self._transition(request, Document.Status.SUBMITTED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._transition(request, Document.Status.APPROVED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._transition(request, Document.Status.REJECTED)

    @action(detail=True, methods=['post'])
    def request_clarification(self, request, pk=None):
        return self._transition(request, Document.Status.CLARIFICATION_REQ)

    def _transition(self, request, target_status):
        document = self.get_object()
        remarks = request.data.get('remarks', 'Status change')
        
        try:
            WorkflowService.transition_document(
                document=document,
                user=request.user,
                new_status=target_status,
                remarks=remarks
            )
            return Response({'status': 'success', 'new_status': target_status})
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Returns a secure presigned URL (or stream endpoint).
        """
        document = self.get_object()
        
        # Log the access
        AuditLog.objects.create(
            actor=request.user,
            action=AuditLog.Action.DOWNLOAD,
            resource_id=str(document.id),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        url = StorageService.get_presigned_url(document.s3_key)
        return Response({'download_url': url})

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Directly streams the file for preview, bypassing presigned URL redirection.
        """
        document = self.get_object()
        
        if not default_storage.exists(document.s3_key):
             return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        file = default_storage.open(document.s3_key)
        response = FileResponse(file)
        response['X-Frame-Options'] = 'ALLOWALL'
        response['Content-Disposition'] = 'inline'
        
        if document.s3_key.lower().endswith('.pdf'):
            response['Content-Type'] = 'application/pdf'
            
        return response

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_new_version(self, request, pk=None):
        """
        Handle revised drawing upload.
        """
        document = self.get_object()
        file_obj = request.FILES.get('file')
        change_remarks = request.data.get('change_remarks', 'Updated version')

        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Archive current version
        VersioningService.create_version(document, request.user)

        # 2. Upload new file
        # We overwrite the 'current' s3_key logic or create new key?
        # Better to keep versions distinct in storage too.
        new_path = f"{document.s3_key}_v{document.current_version + 1}"
        saved_path, file_hash = StorageService.upload_file(file_obj, new_path)

        # 3. Update Document
        document.s3_key = saved_path
        document.file_hash = file_hash
        document.status = Document.Status.SUBMITTED # Reset status on new upload
        document.save()

        # 4. Audit
        AuditLog.objects.create(
            actor=request.user,
            action=AuditLog.Action.UPLOAD,
            resource_id=str(document.id),
            details={'version': document.current_version, 'filename': file_obj.name},
            ip_address=request.META.get('REMOTE_ADDR')
        )
from django.http import FileResponse, HttpResponseNotFound
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, permission_classes

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_file(request):
    """
    Simulates a secure presigned URL access for local dev.
    """
    key = request.META.get('QUERY_STRING', '').split('key=')[-1] # Simple parse or use request.GET
    key = request.GET.get('key')
    
    if not key:
         return HttpResponseNotFound("No key provided")

    if not default_storage.exists(key):
        return HttpResponseNotFound("File not found")
    
    # Check if user has access to this file? 
    # Technically the "Presigned URL" pattern implies the URL ITSELF is the key, 
    # but here we are checking Auth header again, which is even stricter.
    
    file = default_storage.open(key)
    response = FileResponse(file)
    response['Content-Disposition'] = 'inline' # Try to view in browser
    response['X-Frame-Options'] = 'ALLOWALL' # Allow embedding in iframe
    # Ensure Content-Type is PDF if possible (simplistic check)
    if key.lower().endswith('.pdf'):
        response['Content-Type'] = 'application/pdf'
    return response
