"""
API Views for the Communications System.
All views enforce role-based access control server-side.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from .models import Thread, Message, CommunicationAuditLog, Notification
from .serializers import (
    ThreadSerializer, ThreadListSerializer, ThreadCreateSerializer,
    MessageSerializer, MessageCreateSerializer,
    NotificationSerializer, CommunicationAuditLogSerializer
)
from .permissions import (
    CommunicationPermissions, CanInitiateThread, CanSendMessage,
    CanIssueRuling, CanCloseThread, CanViewInternalNotes
)
from .services import CommunicationService, AuditService


class ThreadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for communication threads.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Thread.objects.all()
        
        # Filter out internal notes for unauthorized roles
        if not CommunicationPermissions.can_view_internal_notes(user):
            queryset = queryset.exclude(thread_type=Thread.ThreadType.INTERNAL_NOTE)
        
        # Filter by context if provided
        context_type = self.request.query_params.get('context_type')
        context_id = self.request.query_params.get('context_id')
        
        if context_type and context_id:
            try:
                app_label, model = context_type.split('.')
                ct = ContentType.objects.get(app_label=app_label, model=model)
                queryset = queryset.filter(context_type=ct, context_id=context_id)
            except (ValueError, ContentType.DoesNotExist):
                pass
        
        # Filter by status
        thread_status = self.request.query_params.get('status')
        if thread_status:
            queryset = queryset.filter(status=thread_status)
        
        # Filter by type
        thread_type = self.request.query_params.get('type')
        if thread_type:
            queryset = queryset.filter(thread_type=thread_type)
        
        return queryset.prefetch_related('messages', 'participants')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ThreadListSerializer
        if self.action == 'create':
            return ThreadCreateSerializer
        return ThreadSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new thread with permission check."""
        user = request.user
        
        if not CommunicationPermissions.can_initiate_thread(user):
            return Response(
                {'error': f'Your role ({getattr(user, "role", "Unknown")}) is not authorized to initiate threads.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Get context object
            context_type_str = serializer.validated_data['context_type']
            app_label, model = context_type_str.split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            model_class = ct.model_class()
            
            context_id = serializer.validated_data['context_id']
            try:
                context_object = model_class.objects.get(pk=context_id)
            except model_class.DoesNotExist:
                return Response(
                    {'error': f'{model_class.__name__} with ID {context_id} not found.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create thread using service
            thread = CommunicationService.create_thread(
                user=user,
                subject=serializer.validated_data['subject'],
                context_object=context_object,
                thread_type=serializer.validated_data['thread_type'],
                request=request
            )
            
            # Add recipients as participants
            recipients = serializer.validated_data.get('recipients', [])
            if recipients:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                recipient_users = User.objects.filter(id__in=recipients)
                thread.participants.add(*recipient_users)
            
            # Add initial message if provided
            initial_message = serializer.validated_data.get('initial_message')
            if initial_message:
                CommunicationService.send_message(
                    user=user,
                    thread=thread,
                    content=initial_message,
                    message_type=Message.MessageType.STANDARD,
                    request=request
                )
            
            return Response(ThreadSerializer(thread).data, status=status.HTTP_201_CREATED)
        
        except ContentType.DoesNotExist:
            return Response(
                {'error': f'Invalid context type: {serializer.validated_data["context_type"]}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to create thread: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message to the thread."""
        thread = self.get_object()
        user = request.user
        
        if not CommunicationPermissions.can_send_message(user):
            return Response(
                {'error': 'Your role is not authorized to send messages.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MessageCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        message = CommunicationService.send_message(
            user=user,
            thread=thread,
            content=serializer.validated_data['content'],
            message_type=serializer.validated_data.get('message_type', Message.MessageType.STANDARD),
            reference=serializer.validated_data.get('references'),
            request=request
        )
        
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close the thread."""
        thread = self.get_object()
        user = request.user
        
        if not CommunicationPermissions.can_close_thread(user):
            return Response(
                {'error': 'Your role is not authorized to close threads.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread = CommunicationService.close_thread(user, thread, request)
        return Response(ThreadSerializer(thread).data)
    
    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Manually escalate the thread."""
        thread = self.get_object()
        user = request.user
        
        if not CommunicationPermissions.can_escalate(user):
            return Response(
                {'error': 'Your role is not authorized to escalate threads.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.status = Thread.Status.ESCALATED
        thread.save(update_fields=['status'])
        
        AuditService.log(
            actor=user,
            action=CommunicationAuditLog.Action.ESCALATION_TRIGGERED,
            resource_type='Thread',
            resource_id=thread.id,
            details={'manual': True, 'escalated_by': user.username},
            request=request
        )
        
        return Response(ThreadSerializer(thread).data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])
        return Response(self.get_serializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'All notifications marked as read'})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for audit log viewing (read-only, authorized users only).
    """
    serializer_class = CommunicationAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Only SPV and Government officials can view audit logs
        if user.role not in ['SPV_Official', 'Govt_Official', 'Nodal_Officer']:
            return CommunicationAuditLog.objects.none()
        
        queryset = CommunicationAuditLog.objects.all()
        
        # Filter by resource
        resource_type = self.request.query_params.get('resource_type')
        resource_id = self.request.query_params.get('resource_id')
        
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset
