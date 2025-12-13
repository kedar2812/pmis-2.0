import hashlib
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import Document, DocumentVersion, NotingSheet, AuditLog

class StorageService:
    @staticmethod
    def calculate_hash(file_obj):
        """Calculates SHA-256 hash of a file object."""
        sha256_hash = hashlib.sha256()
        for byte_block in iter(lambda: file_obj.read(4096), b""):
            sha256_hash.update(byte_block)
        file_obj.seek(0) # Reset pointer
        return sha256_hash.hexdigest()

    @staticmethod
    def upload_file(file_obj, path):
        """
        Uploads file to storage (S3/Local) and returns the key.
        Verifies integrity.
        """
        file_hash = StorageService.calculate_hash(file_obj)
        
        # Save to storage
        # In production this would be boto3.client.upload_fileobj
        # Here we use Django's storage system (mimicking S3)
        file_path = default_storage.save(path, file_obj)
        
        return file_path, file_hash

    @staticmethod
    def get_presigned_url(key):
        """
        Generates a temporary accessible URL.
        For local dev, this returns a view URL that checks permissions.
        """
        # In Real S3: return s3_client.generate_presigned_url(...)
        # For Local: Return an API endpoint that streams the file
        return f"/api/edms/download/?key={key}"

class WorkflowService:
    @staticmethod
    def can_transition(user, document, new_status):
        """
        Rule-based Gatekeeper for status changes.
        """
        role = user.role
        current = document.status
        
        # Rule 1: Contractors can only Submit
        if role == 'EPC_Contractor':
            if current == Document.Status.DRAFT and new_status == Document.Status.SUBMITTED:
                return True
            return False

        # Rule 2: PMNC can Review, Approve (if delegated), or Reject
        if role == 'PMNC_Team':
            if current == Document.Status.SUBMITTED and new_status in [Document.Status.UNDER_REVIEW, Document.Status.CLARIFICATION_REQ]:
                return True
            if current == Document.Status.UNDER_REVIEW and new_status in [Document.Status.APPROVED, Document.Status.REJECTED]:
                return True
            return False

        # Rule 3: SPV/Govt can Approve/Reject from Under Review
        if role in ['SPV_Official', 'Govt_Department']:
            if current == Document.Status.UNDER_REVIEW and new_status in [Document.Status.APPROVED, Document.Status.REJECTED]:
                return True
            return False

        return False

    @staticmethod
    def transition_document(document, user, new_status, remarks):
        """
        Executes the transition securely.
        """
        if not WorkflowService.can_transition(user, document, new_status):
            raise PermissionError(f"User {user.username} ({user.role}) cannot transition {document.status} -> {new_status}")

        # 1. Archive current version if modifying
        # (For status change, we might just log it. For file update, we version.)
        
        # 2. Add Noting
        NotingSheet.objects.create(
            document=document,
            user=user,
            role=user.role,
            remark_text=remarks,
            is_ruling=True
        )

        # 3. Update Status
        old_status = document.status
        document.status = new_status
        document.save()

        # 4. Audit Log
        AuditLog.objects.create(
            actor=user,
            action=AuditLog.Action.STATUS_CHANGE,
            resource_id=str(document.id),
            details={'from': old_status, 'to': new_status, 'remarks': remarks}
        )
        
        return document

class VersioningService:
    @staticmethod
    def create_version(document, user, change_remarks="New version uploaded"):
        """
        Copies current document state to history.
        """
        DocumentVersion.objects.create(
            document=document,
            version_number=document.current_version,
            s3_key=document.s3_key,
            file_hash=document.file_hash,
            uploaded_by=user,
            change_remarks=change_remarks
        )
        # Increment parent version
        document.current_version += 1
        document.save()
