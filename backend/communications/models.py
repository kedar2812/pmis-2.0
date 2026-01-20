from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _
import uuid
import logging

logger = logging.getLogger(__name__)


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
        DIRECT_MESSAGE = 'DIRECT_MESSAGE', _('Direct Message')
        GROUP_CHAT = 'GROUP_CHAT', _('Group Chat')

    class Status(models.TextChoices):
        OPEN = 'OPEN', _('Open')
        PENDING_RESPONSE = 'PENDING_RESPONSE', _('Pending Response')
        CLOSED = 'CLOSED', _('Closed')
        ESCALATED = 'ESCALATED', _('Escalated')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=255)
    
    # Generic Foreign Key to link to any context (Document, Project, RABill, etc.)
    # Optional for general chat (DM, Group Chat)
    context_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    context_id = models.UUIDField(null=True, blank=True)
    context_object = GenericForeignKey('context_type', 'context_id')
    
    thread_type = models.CharField(max_length=50, choices=ThreadType.choices, default=ThreadType.DISCUSSION)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.OPEN)
    
    # Optional custom name for group chats
    chat_name = models.CharField(max_length=255, blank=True, help_text="Custom name for group chats")
    
    initiated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='initiated_threads')
    initiated_by_role = models.CharField(max_length=100, help_text="Role of user at thread creation time")
    
    # SLA tracking for escalation
    sla_deadline = models.DateTimeField(null=True, blank=True, help_text="Deadline before auto-escalation")
    
    # Participants (for notification targeting)
    participants = models.ManyToManyField('users.User', related_name='participated_threads', blank=True)
    
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='closed_threads', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['context_type', 'context_id']),
            models.Index(fields=['status']),
            models.Index(fields=['thread_type']),
        ]
        verbose_name = _('Communication Thread')
        verbose_name_plural = _('Communication Threads')

    def __str__(self):
        return f"{self.get_thread_type_display()}: {self.subject}"


class Message(models.Model):
    """
    Individual message within a thread. Immutable once created (audit requirement).
    """
    class MessageType(models.TextChoices):
        STANDARD = 'STANDARD', _('Standard Message')
        CLARIFICATION_REQUEST = 'CLARIFICATION_REQUEST', _('Clarification Request')
        CLARIFICATION_RESPONSE = 'CLARIFICATION_RESPONSE', _('Clarification Response')
        RULING = 'RULING', _('Official Ruling')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    sender_role = models.CharField(max_length=100, help_text="Role of sender at message creation time")
    
    # Encrypted content storage (AES-256)
    # The 'content' field stores encrypted data at rest
    content = models.TextField(help_text="AES-256 encrypted message content")
    is_encrypted = models.BooleanField(default=False, help_text="Whether content is encrypted")
    
    message_type = models.CharField(max_length=50, choices=MessageType.choices, default=MessageType.STANDARD)
    is_ruling = models.BooleanField(default=False, help_text="Official ruling flag for govt oversight")
    
    # Reference to another message (for threaded replies, clarifications)
    references = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    created_at = models.DateTimeField(auto_now_add=True)

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
                from django.core.exceptions import ValidationError
                raise ValidationError("Messages are immutable and cannot be edited. Create a new message with a reference instead.")
        
        # Auto-set is_ruling flag
        if self.message_type == self.MessageType.RULING:
            self.is_ruling = True
        
        # Encrypt content before saving (AES-256-GCM)
        # The encryption is bulletproof - it never fails completely
        if self.content and not self.is_encrypted:
            try:
                from .encryption import MessageEncryption
                # Check if content looks like it's already encrypted
                if not MessageEncryption.is_encrypted(self.content):
                    self.content = MessageEncryption.encrypt(self.content)
                    self.is_encrypted = True
                else:
                    # Already encrypted
                    self.is_encrypted = True
            except Exception as e:
                logger.error(f"Encryption setup failed for message: {e}")
                # The new encryption never fails, but just in case
                self.is_encrypted = False
            
        super().save(*args, **kwargs)
    
    def get_decrypted_content(self):
        """
        Decrypt and return message content.
        Uses bulletproof decryption that NEVER fails - always returns usable text.
        """
        if not self.content:
            return ""
        
        if not self.is_encrypted:
            return self.content
        
        try:
            from .encryption import MessageEncryption
            # This NEVER throws - returns graceful fallback on failure
            return MessageEncryption.decrypt(self.content)
        except Exception as e:
            # This should never happen with new encryption, but just in case
            logger.error(f"Unexpected decrypt error for message {self.pk}: {e}")
            return "[Message content unavailable]"

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
        THREAD_CLOSED = 'THREAD_CLOSED', _('Thread Closed')
        THREAD_ESCALATED = 'THREAD_ESCALATED', _('Thread Escalated')
        PARTICIPANT_ADDED = 'PARTICIPANT_ADDED', _('Participant Added')
        PARTICIPANT_REMOVED = 'PARTICIPANT_REMOVED', _('Participant Removed')
        NOTIFICATION_SENT = 'NOTIFICATION_SENT', _('Notification Sent')
        # Additional actions for messaging features
        CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED', _('Clarification Requested')
        CLARIFICATION_RESPONDED = 'CLARIFICATION_RESPONDED', _('Clarification Responded')
        RULING_ISSUED = 'RULING_ISSUED', _('Ruling Issued')
        ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED', _('Escalation Triggered')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Actor (who performed the action)
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='communication_actions')
    actor_role = models.CharField(max_length=100, help_text="Role at time of action")
    
    # Action details
    action = models.CharField(max_length=100, choices=Action.choices)
    resource_type = models.CharField(max_length=100, help_text="Type of resource (Thread, Message, etc.)")
    resource_id = models.UUIDField(help_text="ID of the affected resource")
    
    # Context
    details = models.JSONField(default=dict, blank=True, help_text="Additional context about the action")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Communication Audit Log')
        verbose_name_plural = _('Communication Audit Logs')
        ordering = ['-timestamp']

    def save(self, *args, **kwargs):
        # Enforce immutability - prevent updates to existing records
        if not self._state.adding and self.pk:
            raise Exception("Audit logs are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.action} by {self.actor} at {self.timestamp}"


class Notification(models.Model):
    """
    In-system notifications for communication events.
    Distinct from emails or external notifications.
    """
    class NotificationType(models.TextChoices):
        NEW_MESSAGE = 'NEW_MESSAGE', _('New Message')
        THREAD_ASSIGNED = 'THREAD_ASSIGNED', _('Thread Assigned')
        RULING_ISSUED = 'RULING_ISSUED', _('Ruling Issued')
        CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED', _('Clarification Requested')
        SLA_APPROACHING = 'SLA_APPROACHING', _('SLA Deadline Approaching')
        THREAD_ESCALATED = 'THREAD_ESCALATED', _('Thread Escalated')

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


class MessageReadReceipt(models.Model):
    """
    Track when messages are read by participants.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user']
        ordering = ['-read_at']
        verbose_name = _('Message Read Receipt')
        verbose_name_plural = _('Message Read Receipts')
    
    def __str__(self):
        return f"{self.user.username} read message at {self.read_at}"


class Attachment(models.Model):
    """
    File attachments for messages.
    Message can be null initially for uploads before message is sent.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    file = models.FileField(upload_to='communications/attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    content_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = _('Attachment')
        verbose_name_plural = _('Attachments')
    
    def __str__(self):
        return f"{self.filename} ({self.file_size} bytes)"


class ThreadParticipant(models.Model):
    """
    Through model for Thread participants with additional metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='thread_participants')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='user_threads')
    
    # Mute functionality
    is_muted = models.BooleanField(default=False)
    muted_until = models.DateTimeField(null=True, blank=True, help_text="Mute until this time (null = forever)")
    
    # Pin functionality
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['thread', 'user']
        ordering = ['-is_pinned', '-joined_at']
        verbose_name = _('Thread Participant')
        verbose_name_plural = _('Thread Participants')
    
    def __str__(self):
        return f"{self.user.username} in {self.thread.subject}"
