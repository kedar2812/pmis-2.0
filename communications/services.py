"""
Services for Communications System.
Handles notification triggers, escalation logic, and audit logging.
"""
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta

from .models import Thread, Message, CommunicationAuditLog, Notification


class AuditService:
    """
    Creates immutable audit log entries for all communication actions.
    """
    
    @staticmethod
    def log(actor, action, resource_type, resource_id, details=None, request=None):
        """
        Create an audit log entry.
        
        Args:
            actor: User performing the action
            action: CommunicationAuditLog.Action choice
            resource_type: 'Thread' or 'Message'
            resource_id: UUID of the resource
            details: Additional context (dict)
            request: HTTP request for IP extraction
        """
        ip_address = None
        
        if request:
            ip_address = request.META.get('REMOTE_ADDR')
        
        return CommunicationAuditLog.objects.create(
            actor=actor,
            actor_role=getattr(actor, 'role', 'Unknown'),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address
        )


class NotificationService:
    """
    Creates and manages notifications for communication events.
    """
    
    @staticmethod
    def notify_thread_participants(thread, notification_type, title, message, exclude_user=None, deep_link=None):
        """
        Send notification to all thread participants.
        
        Args:
            thread: Thread instance
            notification_type: Notification.NotificationType choice
            title: Notification title
            message: Notification body
            exclude_user: User to exclude (typically the sender)
            deep_link: URL to the relevant page
        """
        notifications = []
        
        for participant in thread.participants.all():
            if exclude_user and participant == exclude_user:
                continue
            
            notifications.append(Notification(
                recipient=participant,
                notification_type=notification_type,
                title=title,
                message=message,
                context_type=ContentType.objects.get_for_model(Thread),
                context_id=thread.id,
                deep_link=deep_link or f"/communications/{thread.id}"
            ))
        
        Notification.objects.bulk_create(notifications)
        return notifications
    
    @staticmethod
    def notify_user(user, notification_type, title, message, context_object=None, deep_link=None):
        """
        Send notification to a specific user.
        """
        context_type = None
        context_id = None
        
        if context_object:
            context_type = ContentType.objects.get_for_model(context_object)
            context_id = context_object.pk
        
        return Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            context_type=context_type,
            context_id=context_id,
            deep_link=deep_link or ''
        )


class EscalationService:
    """
    Handles SLA monitoring and automatic escalation.
    """
    
    # Default SLA times (in hours)
    SLA_CLARIFICATION_RESPONSE = 48  # 2 days
    SLA_RULING_REQUIRED = 72  # 3 days
    
    # Role hierarchy for escalation (from lowest to highest authority)
    ESCALATION_CHAIN = [
        'EPC_Contractor',
        'Consultant_Design',
        'PMNC_Team',
        'Govt_Department',
        'NICDC_HQ',
        'SPV_Official',
    ]
    
    @classmethod
    def set_sla_deadline(cls, thread):
        """
        Set the SLA deadline based on thread type.
        """
        if thread.thread_type == Thread.ThreadType.CLARIFICATION:
            hours = cls.SLA_CLARIFICATION_RESPONSE
        elif thread.thread_type == Thread.ThreadType.RULING:
            hours = cls.SLA_RULING_REQUIRED
        else:
            hours = cls.SLA_CLARIFICATION_RESPONSE  # Default
        
        thread.sla_deadline = timezone.now() + timedelta(hours=hours)
        thread.save(update_fields=['sla_deadline'])
        return thread.sla_deadline
    
    @classmethod
    def check_and_escalate(cls):
        """
        Check all open threads for SLA breaches and escalate if needed.
        Should be called by a scheduled task (e.g., Celery beat).
        """
        now = timezone.now()
        breached_threads = Thread.objects.filter(
            status__in=[Thread.Status.OPEN, Thread.Status.PENDING_RESPONSE],
            sla_deadline__lt=now
        ).exclude(status=Thread.Status.ESCALATED)
        
        escalated = []
        
        for thread in breached_threads:
            # Mark as escalated
            thread.status = Thread.Status.ESCALATED
            thread.save(update_fields=['status'])
            
            # Find next authority
            next_authority = cls.get_next_authority(thread.initiated_by_role)
            
            # Create escalation notification
            NotificationService.notify_thread_participants(
                thread=thread,
                notification_type=Notification.NotificationType.ESCALATION,
                title=f"ESCALATION: {thread.subject}",
                message=f"This thread has breached SLA and has been escalated. Immediate action required.",
                deep_link=f"/communications/{thread.id}"
            )
            
            # Audit log
            AuditService.log(
                actor=None,  # System action
                action=CommunicationAuditLog.Action.ESCALATION_TRIGGERED,
                resource_type='Thread',
                resource_id=thread.id,
                details={'reason': 'SLA breach', 'escalated_to': next_authority}
            )
            
            escalated.append(thread)
        
        return escalated
    
    @classmethod
    def get_next_authority(cls, current_role):
        """
        Get the next role in the escalation chain.
        """
        try:
            current_index = cls.ESCALATION_CHAIN.index(current_role)
            if current_index < len(cls.ESCALATION_CHAIN) - 1:
                return cls.ESCALATION_CHAIN[current_index + 1]
        except ValueError:
            pass
        return 'SPV_Official'  # Default to highest authority


class CommunicationService:
    """
    High-level service for communication operations.
    """
    
    @staticmethod
    def create_thread(user, subject, context_object, thread_type, request=None):
        """
        Create a new communication thread.
        """
        thread = Thread.objects.create(
            subject=subject,
            context_type=ContentType.objects.get_for_model(context_object),
            context_id=context_object.pk,
            thread_type=thread_type,
            initiated_by=user,
            initiated_by_role=getattr(user, 'role', 'Unknown'),
            status=Thread.Status.OPEN
        )
        
        # Add creator as participant
        thread.participants.add(user)
        
        # Set SLA deadline
        EscalationService.set_sla_deadline(thread)
        
        # Audit log
        AuditService.log(
            actor=user,
            action=CommunicationAuditLog.Action.THREAD_CREATED,
            resource_type='Thread',
            resource_id=thread.id,
            details={'subject': subject, 'type': thread_type},
            request=request
        )
        
        return thread
    
    @staticmethod
    def send_message(user, thread, content, message_type, reference=None, request=None):
        """
        Send a message in a thread.
        """
        message = Message.objects.create(
            thread=thread,
            sender=user,
            sender_role=getattr(user, 'role', 'Unknown'),
            content=content,
            message_type=message_type,
            references=reference
        )
        
        # Add sender to participants if not already
        thread.participants.add(user)
        
        # Determine audit action
        if message_type == Message.MessageType.CLARIFICATION_REQUEST:
            action = CommunicationAuditLog.Action.CLARIFICATION_REQUESTED
            notification_type = Notification.NotificationType.CLARIFICATION_REQUESTED
            title = f"Clarification Requested: {thread.subject}"
        elif message_type == Message.MessageType.CLARIFICATION_RESPONSE:
            action = CommunicationAuditLog.Action.CLARIFICATION_RESPONDED
            notification_type = Notification.NotificationType.CLARIFICATION_RESPONDED
            title = f"Clarification Received: {thread.subject}"
        elif message_type == Message.MessageType.RULING:
            action = CommunicationAuditLog.Action.RULING_ISSUED
            notification_type = Notification.NotificationType.RULING_ISSUED
            title = f"Ruling Issued: {thread.subject}"
        else:
            action = CommunicationAuditLog.Action.MESSAGE_SENT
            notification_type = Notification.NotificationType.NEW_MESSAGE
            title = f"New Message: {thread.subject}"
        
        # Audit log
        AuditService.log(
            actor=user,
            action=action,
            resource_type='Message',
            resource_id=message.id,
            details={'thread_id': str(thread.id), 'message_type': message_type},
            request=request
        )
        
        # Notify participants
        NotificationService.notify_thread_participants(
            thread=thread,
            notification_type=notification_type,
            title=title,
            message=content[:200] + '...' if len(content) > 200 else content,
            exclude_user=user,
            deep_link=f"/communications/{thread.id}"
        )
        
        # Explicitly update thread timestamp for sorting
        thread.save()
        
        return message
    
    @staticmethod
    def close_thread(user, thread, request=None):
        """
        Close a communication thread.
        """
        thread.status = Thread.Status.CLOSED
        thread.closed_at = timezone.now()
        thread.closed_by = user
        thread.save(update_fields=['status', 'closed_at', 'closed_by'])
        
        # Audit log
        AuditService.log(
            actor=user,
            action=CommunicationAuditLog.Action.THREAD_CLOSED,
            resource_type='Thread',
            resource_id=thread.id,
            details={'closed_by_role': getattr(user, 'role', 'Unknown')},
            request=request
        )
        
        # Notify participants
        NotificationService.notify_thread_participants(
            thread=thread,
            notification_type=Notification.NotificationType.THREAD_CLOSED,
            title=f"Thread Closed: {thread.subject}",
            message=f"This thread has been closed by {user.username}.",
            exclude_user=user,
            deep_link=f"/communications/{thread.id}"
        )
        
        return thread


class ChatService:
    """Service for managing general chat functionality (DMs and Group Chats)."""
    
    @staticmethod
    def create_direct_message(user, recipient):
        """
        Create or get existing DM thread between two users.
        Returns existing thread if one already exists.
        """
        # Check if DM already exists between these two users
        existing = Thread.objects.filter(
            thread_type=Thread.ThreadType.DIRECT_MESSAGE,
            context_type__isnull=True,
            context_id__isnull=True
        ).filter(
            participants=user
        ).filter(
            participants=recipient
        ).first()
        
        if existing:
            return existing
        
        # Create new DM thread
        thread = Thread.objects.create(
            subject=f"Chat with {recipient.username}",
            thread_type=Thread.ThreadType.DIRECT_MESSAGE,
            initiated_by=user,
            initiated_by_role=getattr(user, 'role', 'Unknown'),
            status=Thread.Status.OPEN,
            context_type=None,
            context_id=None
        )
        thread.participants.add(user, recipient)
        
        # Audit log
        AuditService.log(
            actor=user,
            action=CommunicationAuditLog.Action.THREAD_CREATED,
            resource_type='Thread',
            resource_id=thread.id,
            details={'type': 'DIRECT_MESSAGE', 'recipient': recipient.username}
        )
        
        return thread
    
    @staticmethod
    def create_group_chat(user, participants, chat_name=None):
        """
        Create a group chat with multiple participants.
        
        Args:
            user: The user creating the chat
            participants: List of User objects to include
            chat_name: Optional custom name for the group
        
        Returns:
            Thread object
        """
        # Auto-generate name if not provided
        if not chat_name:
            participant_names = [p.username for p in participants[:3]]
            if len(participants) > 3:
                chat_name = f"Group Chat - {', '.join(participant_names)} +{len(participants) - 3} more"
            else:
                chat_name = f"Group Chat - {', '.join(participant_names)}"
        
        # Create group chat thread
        thread = Thread.objects.create(
            subject=chat_name,
            chat_name=chat_name,
            thread_type=Thread.ThreadType.GROUP_CHAT,
            initiated_by=user,
            initiated_by_role=getattr(user, 'role', 'Unknown'),
            status=Thread.Status.OPEN,
            context_type=None,
            context_id=None
        )
        
        # Add creator + all participants
        all_participants = [user] + list(participants)
        thread.participants.add(*all_participants)
        
        # Audit log
        AuditService.log(
            actor=user,
            action=CommunicationAuditLog.Action.THREAD_CREATED,
            resource_type='Thread',
            resource_id=thread.id,
            details={'type': 'GROUP_CHAT', 'participant_count': len(all_participants)}
        )
        
        return thread
    
    @staticmethod
    def get_chat_display_name(thread, current_user):
        """
        Get display name for a chat thread.
        
        For DMs: Returns the other user's name
        For Group Chats: Returns the custom chat name or generated name
        """
        if thread.thread_type == Thread.ThreadType.DIRECT_MESSAGE:
            # For DM, show the other user's name
            other_user = thread.participants.exclude(id=current_user.id).first()
            return other_user.username if other_user else "Direct Message"
        
        elif thread.thread_type == Thread.ThreadType.GROUP_CHAT:
            return thread.chat_name or thread.subject
        
        else:
            # Context-based threads use subject
            return thread.subject
