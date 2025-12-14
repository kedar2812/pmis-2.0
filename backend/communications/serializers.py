"""
Serializers for the Communications System.
"""
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Thread, Message, CommunicationAuditLog, Notification


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Message model.
    Read-only for most fields due to immutability.
    """
    sender_name = serializers.SerializerMethodField()
    references_content = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'sender_name', 'sender_role',
            'content', 'message_type', 'is_ruling', 'references',
            'references_content', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'sender_role', 'is_ruling', 'created_at']
    
    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return 'Unknown'
    
    def get_references_content(self, obj):
        if obj.references:
            return obj.references.content[:100] + '...' if len(obj.references.content) > 100 else obj.references.content
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
    last_message_at = serializers.SerializerMethodField()
    
    class Meta:
        model = Thread
        fields = [
            'id', 'subject', 'context_type', 'context_id', 'context_display',
            'thread_type', 'status', 'initiated_by', 'initiated_by_name',
            'initiated_by_role', 'sla_deadline', 'created_at', 'closed_at',
            'closed_by', 'messages', 'message_count', 'last_message_at'
        ]
        read_only_fields = [
            'id', 'initiated_by', 'initiated_by_role', 'created_at',
            'closed_at', 'closed_by'
        ]
    
    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return f"{obj.initiated_by.first_name} {obj.initiated_by.last_name}".strip() or obj.initiated_by.username
        return 'Unknown'
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_context_display(self, obj):
        """Get a human-readable representation of the linked context."""
        try:
            context = obj.context_object
            if context:
                return str(context)
        except:
            pass
        return f"{obj.context_type.model} ({obj.context_id})"
    
    def get_last_message_at(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        return last_msg.created_at if last_msg else obj.created_at


class ThreadListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for thread list views.
    """
    initiated_by_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Thread
        fields = [
            'id', 'subject', 'context_type', 'context_id',
            'thread_type', 'status', 'initiated_by_name',
            'initiated_by_role', 'sla_deadline', 'created_at',
            'message_count', 'last_message_preview', 'unread_count'
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
            content = last_msg.content[:80] + '...' if len(last_msg.content) > 80 else last_msg.content
            return {
                'sender': last_msg.sender.username if last_msg.sender else 'Unknown',
                'content': content,
                'created_at': last_msg.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        # This would need user context to calculate
        return 0


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
