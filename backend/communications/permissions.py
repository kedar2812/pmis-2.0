"""
Role-Based Access Control for Communications System.
All rules are enforced server-side for security.

User Roles (from users.models.User.Roles):
- SPV_Official: SPV Official
- PMNC_Team: PMNC Team
- EPC_Contractor: EPC Contractor
- Consultant_Design: Design Consultant
- Govt_Department: Government Department
- NICDC_HQ: NICDC HQ
"""
from rest_framework import permissions


class CommunicationPermissions:
    """
    Central permission matrix for the communications system.
    """
    
    # Roles that can initiate new threads
    CAN_INITIATE_THREAD = ['SPV_Official', 'PMNC_Team', 'Govt_Department', 'NICDC_HQ']
    
    # Roles that can send messages (reply)
    CAN_SEND_MESSAGE = ['SPV_Official', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design', 'Govt_Department', 'NICDC_HQ']
    
    # Roles that can request clarifications
    CAN_REQUEST_CLARIFICATION = ['SPV_Official', 'PMNC_Team', 'Govt_Department', 'NICDC_HQ']
    
    # Roles that can issue rulings (authoritative decisions)
    CAN_ISSUE_RULING = ['SPV_Official', 'NICDC_HQ']
    
    # Roles that can view internal notes
    CAN_VIEW_INTERNAL_NOTES = ['SPV_Official', 'PMNC_Team', 'Govt_Department', 'NICDC_HQ']
    
    # Roles that can close threads
    CAN_CLOSE_THREAD = ['SPV_Official', 'PMNC_Team', 'NICDC_HQ']
    
    # Roles that can escalate manually
    CAN_ESCALATE = ['SPV_Official', 'PMNC_Team', 'Govt_Department', 'NICDC_HQ']

    @classmethod
    def can_initiate_thread(cls, user):
        return user.role in cls.CAN_INITIATE_THREAD

    @classmethod
    def can_send_message(cls, user):
        return user.role in cls.CAN_SEND_MESSAGE

    @classmethod
    def can_request_clarification(cls, user):
        return user.role in cls.CAN_REQUEST_CLARIFICATION

    @classmethod
    def can_issue_ruling(cls, user):
        return user.role in cls.CAN_ISSUE_RULING

    @classmethod
    def can_view_internal_notes(cls, user):
        return user.role in cls.CAN_VIEW_INTERNAL_NOTES

    @classmethod
    def can_close_thread(cls, user):
        return user.role in cls.CAN_CLOSE_THREAD

    @classmethod
    def can_escalate(cls, user):
        return user.role in cls.CAN_ESCALATE


class CanInitiateThread(permissions.BasePermission):
    """
    Permission check for initiating new threads.
    """
    message = "Your role is not authorized to initiate communication threads."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return CommunicationPermissions.can_initiate_thread(request.user)


class CanSendMessage(permissions.BasePermission):
    """
    Permission check for sending messages.
    """
    message = "Your role is not authorized to send messages."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return CommunicationPermissions.can_send_message(request.user)


class CanIssueRuling(permissions.BasePermission):
    """
    Permission check for issuing rulings.
    Only SPV_Official can issue authoritative rulings.
    """
    message = "Only SPV Officials are authorized to issue rulings."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return CommunicationPermissions.can_issue_ruling(request.user)


class CanCloseThread(permissions.BasePermission):
    """
    Permission check for closing threads.
    """
    message = "Your role is not authorized to close communication threads."

    def has_permission(self, request, view):
        return CommunicationPermissions.can_close_thread(request.user)


class CanViewInternalNotes(permissions.BasePermission):
    """
    Permission check for viewing internal notes.
    Contractors and external users cannot see internal notes.
    """
    message = "Internal notes are not accessible to your role."

    def has_object_permission(self, request, view, obj):
        # Check if the thread or message is internal
        if hasattr(obj, 'thread_type'):
            if obj.thread_type == 'INTERNAL_NOTE':
                return CommunicationPermissions.can_view_internal_notes(request.user)
        if hasattr(obj, 'message_type'):
            if obj.message_type == 'INTERNAL':
                return CommunicationPermissions.can_view_internal_notes(request.user)
        return True
