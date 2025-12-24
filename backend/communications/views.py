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
        
        # Sort by latest activity (optimized native field)
        queryset = queryset.order_by('-updated_at')
        
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

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in the thread as read for the current user."""
        thread = self.get_object()
        user = request.user
        
        from .models import MessageReadReceipt
        
        # Get all messages in thread not sent by user
        messages = thread.messages.exclude(sender=user)
        
        # Find messages that don't have a read receipt from this user
        unread_messages = messages.exclude(read_receipts__user=user)
        
        # Bulk create receipts
        receipts = [
            MessageReadReceipt(message=msg, user=user)
            for msg in unread_messages
        ]
        
        if receipts:
            MessageReadReceipt.objects.bulk_create(receipts, ignore_conflicts=True)
            
        return Response({'status': 'marked as read', 'count': len(receipts)})
    
    @action(detail=False, methods=['post'])
    def start_dm(self, request):
        """Start a direct message with a user."""
        from .services import ChatService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        recipient_id = request.data.get('recipient_id')
        if not recipient_id:
            return Response(
                {'error': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Recipient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create or get existing DM
        thread = ChatService.create_direct_message(request.user, recipient)
        return Response(ThreadSerializer(thread).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def start_group_chat(self, request):
        """Start a group chat with multiple users."""
        from .services import ChatService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        participant_ids = request.data.get('participant_ids', [])
        chat_name = request.data.get('chat_name', '')
        
        if not participant_ids or len(participant_ids) < 1:
            return Response(
                {'error': 'At least one participant is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            participants = User.objects.filter(id__in=participant_ids)
            if participants.count() != len(participant_ids):
                return Response(
                    {'error': 'Some participants not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': f'Invalid participant IDs: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create group chat
        thread = ChatService.create_group_chat(request.user, participants, chat_name)
        return Response(ThreadSerializer(thread).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        """Pin/unpin a thread for the current user."""
        from .models import ThreadParticipant
        thread = self.get_object()
        
        participant, created = ThreadParticipant.objects.get_or_create(
            thread=thread,
            user=request.user
        )
        
        # Toggle pin status
        participant.is_pinned = not participant.is_pinned
        participant.pinned_at = timezone.now() if participant.is_pinned else None
        participant.save(update_fields=['is_pinned', 'pinned_at'])
        
        return Response({
            'is_pinned': participant.is_pinned,
            'message': 'Thread pinned' if participant.is_pinned else 'Thread unpinned'
        })
    
    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        """Mute a thread for the current user."""
        from .models import ThreadParticipant
        from datetime import timedelta
        
        thread = self.get_object()
        duration = request.data.get('duration', 'forever')  # Options: '1h', '8h', '24h', 'forever'
        
        participant, created = ThreadParticipant.objects.get_or_create(
            thread=thread,
            user=request.user
        )
        
        # Calculate mute duration
        muted_until = None
        if duration != 'forever':
            hours = {'1h': 1, '8h': 8, '24h': 24}.get(duration, 24)
            muted_until = timezone.now() + timedelta(hours=hours)
        
        participant.is_muted = True
        participant.muted_until = muted_until
        participant.save(update_fields=['is_muted', 'muted_until'])
        
        return Response({
            'is_muted': True,
            'muted_until': muted_until,
            'message': f'Thread muted {duration}'
        })
    
    @action(detail=True, methods=['post'])
    def unmute(self, request, pk=None):
        """Unmute a thread for the current user."""
        from .models import ThreadParticipant
        
        thread = self.get_object()
        
        try:
            participant = ThreadParticipant.objects.get(thread=thread, user=request.user)
            participant.is_muted = False
            participant.muted_until = None
            participant.save(update_fields=['is_muted', 'muted_until'])
            return Response({'is_muted': False, 'message': 'Thread unmuted'})
        except ThreadParticipant.DoesNotExist:
            return Response({'error': 'Not a participant'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        """Leave a group chat."""
        thread = self.get_object()
        
        # Only allow leaving group chats
        if thread.thread_type != Thread.ThreadType.GROUP_CHAT:
            return Response(
                {'error': 'Can only leave group chats'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove user from participants
        if request.user in thread.participants.all():
            thread.participants.remove(request.user)
            
            # Update ThreadParticipant left_at
            from .models import ThreadParticipant
            try:
                participant = ThreadParticipant.objects.get(thread=thread, user=request.user)
                participant.left_at = timezone.now()
                participant.save(update_fields=['left_at'])
            except ThreadParticipant.DoesNotExist:
                pass
            
            # Audit log
            AuditService.log(
                actor=request.user,
                action=CommunicationAuditLog.Action.PARTICIPANT_REMOVED,
                resource_type='Thread',
                resource_id=thread.id,
                details={'user': request.user.username, 'action': 'left_group'}
            )
            
            return Response({'message': 'Left group successfully'})
        
        return Response({'error': 'Not a participant'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_participants(self, request, pk=None):
        """Add participants to a group chat."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        thread = self.get_object()
        
        # Only allow adding to group chats
        if thread.thread_type != Thread.ThreadType.GROUP_CHAT:
            return Response(
                {'error': 'Can only add participants to group chats'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        participant_ids = request.data.get('participant_ids', [])
        if not participant_ids:
            return Response(
                {'error': 'No participants specified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_participants = User.objects.filter(id__in=participant_ids)
            thread.participants.add(*new_participants)
            
            # Audit log
            AuditService.log(
                actor=request.user,
                action=CommunicationAuditLog.Action.PARTICIPANT_ADDED,
                resource_type='Thread',
                resource_id=thread.id,
                details={
                    'added_by': request.user.username,
                    'participant_count': new_participants.count()
                }
            )
            
            return Response({
                'message': f'Added {new_participants.count()} participants',
                'thread': ThreadSerializer(thread).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )



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
