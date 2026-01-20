"""
Serializers for the Communications System.
"""
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Thread, Message, CommunicationAuditLog, Notification, Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Attachment model.
    Download happens via secure authenticated endpoint, no URL exposed.
    """
    class Meta:
        model = Attachment
        fields = [
            'id', 'filename', 'file_size', 'content_type', 
            'uploaded_at', 'uploaded_by'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by']


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Message model.
    Read-only for most fields due to immutability.
    Content is decrypted for authorized users.
    """
    sender_name = serializers.SerializerMethodField()
    references_content = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()  # Decrypt on read
    attachments = AttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'sender_name', 'sender_role',
            'content', 'message_type', 'is_ruling', 'references',
            'references_content', 'created_at', 'is_encrypted', 'attachments'
        ]
        read_only_fields = ['id', 'sender', 'sender_role', 'is_ruling', 'created_at', 'is_encrypted']
    
    def get_content(self, obj):
        """Return decrypted message content."""
        return obj.get_decrypted_content()
    
    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return 'Unknown'
    
    def get_references_content(self, obj):
        if obj.references:
            decrypted = obj.references.get_decrypted_content()
            return decrypted[:100] + '...' if len(decrypted) > 100 else decrypted
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new messages.
    """
    class Meta:
        model = Message
        fields = ['content', 'message_type', 'references']
    
    def validate_message_type(self, value):
        user = self.context['request'].user
        from .permissions import CommunicationPermissions
        
        # Validate ruling permissions
        if value == Message.MessageType.RULING:
            if not CommunicationPermissions.can_issue_ruling(user):
                raise serializers.ValidationError("Your role is not authorized to issue rulings.")
        
        # Validate clarification request permissions
        if value == Message.MessageType.CLARIFICATION_REQUEST:
            if not CommunicationPermissions.can_request_clarification(user):
                raise serializers.ValidationError("Your role is not authorized to request clarifications.")
        
        return value


class ThreadSerializer(serializers.ModelSerializer):
    """
    Serializer for Thread model with nested messages.
    """
    initiated_by_name = serializers.SerializerMethodField()
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    context_display = serializers.SerializerMethodField()
    context_model = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    
    class Meta:
        model = Thread
        fields = [
            'id', 'subject', 'context_type', 'context_id', 'context_display', 'context_model',
            'thread_type', 'status', 'initiated_by', 'initiated_by_name',
            'initiated_by_role', 'sla_deadline', 'created_at', 'closed_at',
            'closed_by', 'messages', 'message_count', 'last_message_at',
            'is_pinned', 'is_muted', 'participants'
        ]
        read_only_fields = [
            'id', 'initiated_by', 'initiated_by_role', 'created_at',
            'closed_at', 'closed_by'
        ]

    def get_participants(self, obj):
        return [
            {
                'id': p.id,
                'username': p.username,
                'email': p.email,
                'role': p.role,
                'full_name': f"{p.first_name} {p.last_name}".strip() or p.username
            }
            for p in obj.participants.all()
        ]
    
    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return f"{obj.initiated_by.first_name} {obj.initiated_by.last_name}".strip() or obj.initiated_by.username
        return 'Unknown'
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_context_display(self, obj):
        """Get a human-readable representation of the linked context."""
        # Handle general chats (DM, Group Chat) without context
        if not obj.context_type:
            if obj.thread_type == 'DIRECT_MESSAGE':
                return 'Direct Message'
            elif obj.thread_type == 'GROUP_CHAT':
                return 'Group Chat'
            return 'General Chat'
        
        try:
            context = obj.context_object
            if context:
                return str(context)
        except:
            pass
        return f"{obj.context_type.model} ({obj.context_id})"
    
    def get_context_model(self, obj):
        if obj.context_type:
            return obj.context_type.model
        return None
    
    def get_last_message_at(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        return last_msg.created_at if last_msg else obj.created_at
    
    def get_is_pinned(self, obj):
        """Check if thread is pinned for the current user."""
        request = self.context.get('request')
        if request and request.user:
            from .models import ThreadParticipant
            try:
                participant = ThreadParticipant.objects.get(thread=obj, user=request.user)
                return participant.is_pinned
            except ThreadParticipant.DoesNotExist:
                return False
        return False
    
    def get_is_muted(self, obj):
        """Check if thread is muted for the current user."""
        request = self.context.get('request')
        if request and request.user:
            from .models import ThreadParticipant
            from django.utils import timezone
            try:
                participant = ThreadParticipant.objects.get(thread=obj, user=request.user)
                # Check if muted and not expired
                if participant.is_muted:
                    if participant.muted_until is None:  # Forever
                        return True
                    elif participant.muted_until > timezone.now():  # Not expired
                        return True
                    else:  # Expired
                        participant.is_muted = False
                        participant.muted_until = None
                        participant.save()
                        return False
                return False
            except ThreadParticipant.DoesNotExist:
                return False
        return False


class ThreadListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for thread list views.
    Includes participants for DM name resolution.
    """
    initiated_by_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    
    class Meta:
        model = Thread
        fields = [
            'id', 'subject', 'context_type', 'context_id',
            'thread_type', 'status', 'initiated_by_name',
            'initiated_by_role', 'sla_deadline', 'created_at', 'updated_at',
            'message_count', 'last_message_preview', 'unread_count', 'participants'
        ]
    
    def get_participants(self, obj):
        """Return minimal participant info for DM name resolution."""
        return [
            {
                'id': p.id,
                'username': p.username,
                'full_name': f"{p.first_name} {p.last_name}".strip() or p.username
            }
            for p in obj.participants.all()[:10]  # Limit for performance
        ]
    
    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return f"{obj.initiated_by.first_name} {obj.initiated_by.last_name}".strip() or obj.initiated_by.username
        return 'Unknown'
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message_preview(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            # Decrypt content for preview
            decrypted = last_msg.get_decrypted_content()
            content = decrypted[:80] + '...' if len(decrypted) > 80 else decrypted
            return {
                'sender': last_msg.sender.username if last_msg.sender else 'Unknown',
                'content': content,
                'created_at': last_msg.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
            
        from .models import MessageReadReceipt
        
        # Count messages not sent by user and not read by user
        unread_count = obj.messages.exclude(sender=request.user).exclude(
            read_receipts__user=request.user
        ).count()
        
        return unread_count


class ThreadCreateSerializer(serializers.Serializer):
    """
    Serializer for creating new threads.
    """
    subject = serializers.CharField(max_length=255)
    context_type = serializers.CharField()  # e.g., 'edms.document', 'projects.project'
    context_id = serializers.UUIDField()
    thread_type = serializers.ChoiceField(choices=Thread.ThreadType.choices)
    initial_message = serializers.CharField(required=False, allow_blank=True)
    recipients = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of user IDs to add as participants"
    )
    
    def validate_context_type(self, value):
        try:
            app_label, model = value.split('.')
            ContentType.objects.get(app_label=app_label, model=model)
        except (ValueError, ContentType.DoesNotExist):
            raise serializers.ValidationError(f"Invalid context type: {value}")
        return value
    
    def validate_thread_type(self, value):
        user = self.context['request'].user
        from .permissions import CommunicationPermissions
        
        # Internal notes require special permissions
        if value == Thread.ThreadType.INTERNAL_NOTE:
            if not CommunicationPermissions.can_view_internal_notes(user):
                raise serializers.ValidationError("Your role cannot create internal notes.")
        
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    """
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'deep_link', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'deep_link', 'created_at']


class CommunicationAuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit log entries (read-only).
    """
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationAuditLog
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
