"""
EDMS Permissions - Role-Based Access Control

RBAC Matrix:
- EPC_Contractor: Upload own, view own, no approval
- Consultant_Design: Upload own, view own, no approval
- PMNC_Team: Full view, validate documents
- Govt_Department: View only
- SPV_Official: Full control, final approval
- NICDC_HQ: Full control, final approval
"""
from rest_framework import permissions


class EDMSPermissions:
    """
    Central permission matrix for the EDMS.
    """
    
    # Roles that can upload documents
    CAN_UPLOAD = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design']
    
    # Roles that can view all documents (not just their own)
    CAN_VIEW_ALL = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'Govt_Department']
    
    # Roles that can create folders
    CAN_CREATE_FOLDER = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design']
    
    # Roles that can move documents between folders
    CAN_MOVE_DOCUMENT = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']
    
    # Roles that can validate documents (PMNC review)
    CAN_VALIDATE = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']
    
    # Roles that can give final approval
    CAN_APPROVE = ['SPV_Official', 'NICDC_HQ']
    
    # Roles that can view confidential documents
    CAN_VIEW_CONFIDENTIAL = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']
    
    # Roles that can view audit logs
    CAN_VIEW_AUDIT = ['SPV_Official', 'NICDC_HQ']
    
    # Roles that can archive documents (soft delete)
    CAN_ARCHIVE = ['SPV_Official', 'NICDC_HQ']
    
    # =========================================
    # NOTING SHEET PERMISSIONS
    # =========================================
    
    # Roles that can add noting entries (formal remarks, recommendations)
    CAN_ADD_NOTING = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']
    
    # Roles that can add RULING notes (decisions that trigger status changes)
    CAN_ADD_RULING = ['SPV_Official', 'NICDC_HQ']
    
    # Roles that can respond to clarification requests
    CAN_RESPOND_CLARIFICATION = ['EPC_Contractor', 'Consultant_Design']
    
    # Roles that can view all noting sheets
    CAN_VIEW_ALL_NOTINGS = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'Govt_Department']
    
    @classmethod
    def can_upload(cls, user):
        return getattr(user, 'role', None) in cls.CAN_UPLOAD
    
    @classmethod
    def can_view_all(cls, user):
        return getattr(user, 'role', None) in cls.CAN_VIEW_ALL
    
    @classmethod
    def can_create_folder(cls, user):
        return getattr(user, 'role', None) in cls.CAN_CREATE_FOLDER
    
    @classmethod
    def can_move_document(cls, user):
        return getattr(user, 'role', None) in cls.CAN_MOVE_DOCUMENT
    
    @classmethod
    def can_validate(cls, user):
        return getattr(user, 'role', None) in cls.CAN_VALIDATE
    
    @classmethod
    def can_approve(cls, user):
        return getattr(user, 'role', None) in cls.CAN_APPROVE
    
    @classmethod
    def can_view_confidential(cls, user):
        return getattr(user, 'role', None) in cls.CAN_VIEW_CONFIDENTIAL
    
    @classmethod
    def can_view_audit(cls, user):
        return getattr(user, 'role', None) in cls.CAN_VIEW_AUDIT
    
    @classmethod
    def can_archive(cls, user):
        return getattr(user, 'role', None) in cls.CAN_ARCHIVE
    
    # =========================================
    # NOTING SHEET PERMISSION HELPERS
    # =========================================
    
    @classmethod
    def can_add_noting(cls, user, note_type='REMARK'):
        """Check if user can add a noting entry of the given type."""
        role = getattr(user, 'role', None)
        
        # RULING notes require special permission
        if note_type == 'RULING':
            return role in cls.CAN_ADD_RULING
        
        # Clarification responses allowed for EPC/Consultants
        if note_type == 'CLARIFICATION_RESPONSE':
            return role in cls.CAN_RESPOND_CLARIFICATION or role in cls.CAN_ADD_NOTING
        
        # Other note types require general noting permission
        return role in cls.CAN_ADD_NOTING
    
    @classmethod
    def can_view_all_notings(cls, user):
        return getattr(user, 'role', None) in cls.CAN_VIEW_ALL_NOTINGS
    
    @classmethod
    def can_view_document(cls, user, document):
        """Check if user can view a specific document."""
        # Admins can see all
        if cls.can_view_all(user):
            return True
        
        # For confidential docs, need special permission
        if document.is_confidential and not cls.can_view_confidential(user):
            return False
        
        # Users can see their own uploads
        if document.uploaded_by == user:
            return True
        
        # Users in same project can see non-confidential docs
        # (This can be refined based on project membership)
        return not document.is_confidential
    
    @classmethod
    def can_edit_document(cls, user, document):
        """Check if user can edit/upload new version of a document."""
        from .models import Document
        
        # Only editable in DRAFT or REVISION_REQUESTED status
        if document.status not in [Document.Status.DRAFT, Document.Status.REVISION_REQUESTED]:
            return False
        
        # Uploader or admins can edit
        if document.uploaded_by == user:
            return True
        return user.role in ['SPV_Official', 'NICDC_HQ', 'PMNC_Team']


class CanUploadDocument(permissions.BasePermission):
    """Permission class for document upload."""
    
    def has_permission(self, request, view):
        return EDMSPermissions.can_upload(request.user)


class CanCreateFolder(permissions.BasePermission):
    """Permission class for folder creation."""
    
    def has_permission(self, request, view):
        return EDMSPermissions.can_create_folder(request.user)


class CanValidateDocument(permissions.BasePermission):
    """Permission class for PMNC validation."""
    
    def has_permission(self, request, view):
        return EDMSPermissions.can_validate(request.user)


class CanApproveDocument(permissions.BasePermission):
    """Permission class for SPV final approval."""
    
    def has_permission(self, request, view):
        return EDMSPermissions.can_approve(request.user)


class CanViewAuditLog(permissions.BasePermission):
    """Permission class for audit log access."""
    
    def has_permission(self, request, view):
        return EDMSPermissions.can_view_audit(request.user)
