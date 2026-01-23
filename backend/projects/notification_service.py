"""
Package Assignment Notification Service

Handles email and in-app notifications when a contractor is assigned to a work package.
Government-grade implementation with comprehensive error handling and logging.
"""

import logging
from typing import Optional
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class PackageNotificationService:
    """
    Service for sending package assignment notifications.
    
    Features:
    - Email notifications to contractor's linked user
    - In-app notifications via notifications app
    - Comprehensive error handling
    - Audit logging
    """
    
    @staticmethod
    def send_package_assignment_notification(package, assigned_by=None):
        """
        Send notification when contractor is assigned to package.
        
        Args:
            package: WorkPackage instance
            assigned_by: User who assigned the package (optional)
            
        Returns:
            dict: Status of email and in-app notification attempts
        """
        try:
            # Validate package has contractor with linked user
            if not package.contractor_master:
                logger.warning(f"Package {package.id} has no contractor assigned")
                return {'success': False, 'error': 'No contractor assigned'}
            
            contractor = package.contractor_master
            
            if not contractor.linked_user:
                logger.warning(f"Contractor {contractor.id} ({contractor.name}) has no linked user account")
                return {'success': False, 'error': 'Contractor has no linked user account'}
            
            recipient_user = contractor.linked_user
            
            # Send email notification
            email_sent = PackageNotificationService._send_email_notification(
                package, contractor, recipient_user, assigned_by
            )
            
            # Create in-app notification
            notification_created = PackageNotificationService._create_in_app_notification(
                package, contractor, recipient_user, assigned_by
            )
            
            logger.info(f"Package assignment notification sent for package {package.id} to contractor {contractor.id}")
            
            return {
                'success': True,
                'email_sent': email_sent,
                'notification_created': notification_created,
                'recipient': recipient_user.email
            }
            
        except Exception as e:
            logger.error(f"Failed to send package assignment notification: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _send_email_notification(package, contractor, recipient_user, assigned_by=None):
        """Send email notification about package assignment."""
        try:
            # Prepare email context
            context = {
                'contractor_name': contractor.name,
                'recipient_name': recipient_user.get_full_name() or recipient_user.username,
                'package_name': package.name,
                'project_name': package.project.name,
                'agreement_no': package.agreement_no,
                'agreement_date': package.agreement_date,
                'budget': package.budget,
                'start_date': package.start_date,
                'end_date': package.end_date,
                'responsible_staff': package.responsible_staff,
                'assigned_by': assigned_by.get_full_name() if assigned_by else 'System',
                'login_url': f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else 'https://pmis.example.com/login',
            }
            
            # Render HTML email
            html_message = render_to_string('emails/package_assignment.html', context) if hasattr(settings, 'TEMPLATES') else None
            plain_message = strip_tags(html_message) if html_message else PackageNotificationService._get_plain_email_text(context)
            
            # Send email
            send_mail(
                subject=f'Package Assignment: {package.name}',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@pmis.gov.in',
                recipient_list=[recipient_user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Email sent to {recipient_user.email} for package {package.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def _get_plain_email_text(context):
        """Generate plain text email body."""
        return f"""
Dear {context['contractor_name']},

You have been assigned to a new work package in the Project Management Information System (PMIS).

Package Details:
- Package Name: {context['package_name']}
- Project: {context['project_name']}
- Agreement Number: {context['agreement_no']}
- Agreement Date: {context['agreement_date']}
- Budget: ₹{context['budget']:,.2f}
- Start Date: {context['start_date']}
- End Date: {context['end_date']}
- Responsible Staff: {context['responsible_staff']}

Assigned by: {context['assigned_by']}

Please log in to the PMIS portal to view full details and upload required documents:
{context['login_url']}

If you have any questions, please contact the responsible staff member.

Best regards,
PMIS Team
Government of India
"""
    
    @staticmethod
    def _create_in_app_notification(package, contractor, recipient_user, assigned_by=None):
        """Create in-app notification for package assignment."""
        try:
            # Check if notifications app exists
            from django.apps import apps
            if not apps.is_installed('notifications'):
                logger.warning("Notifications app not installed, skipping in-app notification")
                return False
            
            from notifications.models import Notification
            
            # Create notification
            notification = Notification.objects.create(
                user=recipient_user,
                notification_type='PACKAGE_ASSIGNMENT',
                title=f'New Package Assignment: {package.name}',
                message=f'You have been assigned to work package "{package.name}" for project "{package.project.name}". Agreement: {package.agreement_no}',
                priority='HIGH',
                metadata={
                    'package_id': str(package.id),
                    'project_id': str(package.project.id),
                    'contractor_id': str(contractor.id),
                    'agreement_no': package.agreement_no,
                    'assigned_by': assigned_by.id if assigned_by else None,
                },
                action_url=f'/projects/{package.project.id}/packages/{package.id}',
            )
            
            logger.info(f"In-app notification created for user {recipient_user.id} regarding package {package.id}")
            return True
            
        except ImportError:
            logger.warning("Notifications app not available, skipping in-app notification")
            return False
        except Exception as e:
            logger.error(f"Failed to create in-app notification: {str(e)}", exc_info=True)
            return False
