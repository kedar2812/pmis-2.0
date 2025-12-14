from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _
import uuid


class Thread(models.Model):
    """
    Contextual conversation container.
    All communications must be anchored to a system object.
    """
    class ThreadType(models.TextChoices):
        DISCUSSION = 'DISCUSSION', _('Discussion')
        CLARIFICATION = 'CLARIFICATION', _('Clarification Request')
        INTERNAL_NOTE = 'INTERNAL_NOTE', _('Internal Note')
        RULING = 'RULING', _('Ruling/Decision')

    class Status(models.TextChoices):
        OPEN = 'OPEN', _('Open')
        PENDING_RESPONSE = 'PENDING_RESPONSE', _('Pending Response')
        CLOSED = 'CLOSED', _('Closed')
        ESCALATED = 'ESCALATED', _('Escalated')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=255)
    
    # Generic Foreign Key to link to any context (Document, Project, RABill, etc.)
    context_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    context_id = models.UUIDField()
    context_object = GenericForeignKey('context_type', 'context_id')
    
    thread_type = models.CharField(max_length=50, choices=ThreadType.choices, default=ThreadType.DISCUSSION)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.OPEN)
    
    initiated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='initiated_threads')
    initiated_by_role = models.CharField(max_length=100, help_text="Role of user at thread creation time")
    
    # SLA tracking for escalation
    sla_deadline = models.DateTimeField(null=True, blank=True, help_text="Deadline before auto-escalation")
    
    # Participants (for notification targeting)
    participants = models.ManyToManyField('users.User', related_name='participated_threads', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_threads')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['context_type', 'context_id']),
            models.Index(fields=['status']),
            models.Index(fields=['thread_type']),
        ]

    def __str__(self):
        return f"[{self.thread_type}] {self.subject}"


class Message(models.Model):
    """
    Immutable communication unit.
    Once created, messages CANNOT be edited or deleted.
    """
    class MessageType(models.TextChoices):
        STANDARD = 'STANDARD', _('Standard Message')
        CLARIFICATION_REQUEST = 'CLARIFICATION_REQUEST', _('Clarification Request')
        CLARIFICATION_RESPONSE = 'CLARIFICATION_RESPONSE', _('Clarification Response')
        RULING = 'RULING', _('Ruling/Decision')
        INTERNAL = 'INTERNAL', _('Internal Note')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    
    sender = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='sent_messages')
    sender_role = models.CharField(max_length=100, help_text="Role of sender at message creation time")
    
    content = models.TextField()
    message_type = models.CharField(max_length=50, choices=MessageType.choices, default=MessageType.STANDARD)
    
    # For corrections/references to previous messages
    references = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='referenced_by', help_text="Reference to a previous message for corrections")
    
    # Ruling-specific fields
    is_ruling = models.BooleanField(default=False, help_text="Marks this as an authoritative ruling")
    
    created_at = models.DateTimeField(auto_now_add=True)
    # NO updated_at - messages are immutable

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['thread']),
            models.Index(fields=['sender']),
            models.Index(fields=['message_type']),
        ]

    def save(self, *args, **kwargs):
        # Enforce immutability - prevent updates to existing messages
        if self.pk:
            existing = Message.objects.filter(pk=self.pk).first()
            if existing:
                raise Exception("Messages are immutable and cannot be edited. Create a new message with a reference instead.")
        
        # Auto-set is_ruling flag
        if self.message_type == self.MessageType.RULING:
            self.is_ruling = True
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Message by {self.sender} in {self.thread.subject}"


class CommunicationAuditLog(models.Model):
    """
    Tamper-proof audit trail for all communication actions.
    Every action generates an immutable audit entry.
    """
    class Action(models.TextChoices):
        THREAD_CREATED = 'THREAD_CREATED', _('Thread Created')
        MESSAGE_SENT = 'MESSAGE_SENT', _('Message Sent')
        CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED', _('Clarification Requested')
        CLARIFICATION_RESPONDED = 'CLARIFICATION_RESPONDED', _('Clarification Responded')
        RULING_ISSUED = 'RULING_ISSUED', _('Ruling Issued')
        THREAD_CLOSED = 'THREAD_CLOSED', _('Thread Closed')
        ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED', _('Escalation Triggered')
        THREAD_VIEWED = 'THREAD_VIEWED', _('Thread Viewed')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    actor_role = models.CharField(max_length=100)
    action = models.CharField(max_length=50, choices=Action.choices)
    
    # What was acted upon
    resource_type = models.CharField(max_length=100, help_text="Thread or Message")
    resource_id = models.UUIDField()
    
    # Additional context
    details = models.JSONField(default=dict, blank=True)
    
    # Security metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor']),
            models.Index(fields=['action']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['timestamp']),
        ]

    def save(self, *args, **kwargs):
        # Audit logs are immutable
        if self.pk and CommunicationAuditLog.objects.filter(pk=self.pk).exists():
            raise Exception("Audit logs are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.action} by {self.actor} at {self.timestamp}"


class Notification(models.Model):
    """
    Action-oriented notifications.
    Each notification drives a specific user action.
    """
    class NotificationType(models.TextChoices):
        NEW_MESSAGE = 'NEW_MESSAGE', _('New Message')
        CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED', _('Clarification Requested')
        CLARIFICATION_RESPONDED = 'CLARIFICATION_RESPONDED', _('Clarification Responded')
        RULING_ISSUED = 'RULING_ISSUED', _('Ruling Issued')
        ESCALATION = 'ESCALATION', _('Escalation Alert')
        DEADLINE_BREACH = 'DEADLINE_BREACH', _('Deadline Breach')
        THREAD_CLOSED = 'THREAD_CLOSED', _('Thread Closed')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    recipient = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Link to context
    context_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    context_id = models.UUIDField(null=True, blank=True)
    deep_link = models.CharField(max_length=500, blank=True, help_text="Direct URL to the relevant page")
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient}"
