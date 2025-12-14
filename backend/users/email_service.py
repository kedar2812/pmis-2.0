"""
Email Service for User Management

Uses SendGrid for development, can be switched to AWS SES for production.
"""
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

# SendGrid settings should be configured in settings.py:
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.sendgrid.net'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'apikey'
# EMAIL_HOST_PASSWORD = '<your-sendgrid-api-key>'
# DEFAULT_FROM_EMAIL = 'noreply@pmis-zia.gov.in'


def send_invite_email(user, invite_url):
    """Send invite email to internal user."""
    subject = 'You have been invited to PMIS - Zaheerabad Industrial Area'
    
    message = f"""
Dear {user.first_name} {user.last_name},

You have been invited to join the Programme Management Information System (PMIS) 
for Zaheerabad Industrial Area.

Your Role: {user.get_role_display()}
Department: {user.department or 'N/A'}

Please click the link below to set your password and activate your account:
{invite_url}

This link will expire in 7 days.

If you did not expect this invitation, please ignore this email.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[EMAIL] Invite sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send invite to {user.email}: {e}")
        raise


def send_registration_confirmation(user):
    """Send confirmation email after contractor registration."""
    subject = 'Registration Received - PMIS Zaheerabad Industrial Area'
    
    message = f"""
Dear {user.first_name} {user.last_name},

Thank you for registering on the Programme Management Information System (PMIS).

Your registration has been received and is pending approval by our administrators.

Registration Details:
- Company: {user.company_name}
- PAN: {user.pan_number}
- GSTIN: {user.gstin_number}
- Email: {user.email}

You will receive another email once your account has been reviewed and activated.

If you have any questions, please contact the PMNC team.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[EMAIL] Registration confirmation sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send confirmation to {user.email}: {e}")


def notify_admins_new_registration(user):
    """Notify admin users about new contractor registration."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Get all SPV and PMNC users
    admins = User.objects.filter(
        role__in=['SPV_Official', 'PMNC_Team'],
        is_active=True,
        account_status='ACTIVE'
    )
    
    if not admins.exists():
        print("[EMAIL] No admin users found to notify")
        return
    
    subject = f'New Contractor Registration Pending Approval - {user.company_name}'
    
    message = f"""
A new contractor has registered on PMIS and requires approval.

Company Details:
- Name: {user.company_name}
- Contact: {user.first_name} {user.last_name}
- Email: {user.email}
- Phone: {user.phone_number}
- PAN: {user.pan_number}
- GSTIN: {user.gstin_number}

Please login to PMIS to review and approve/reject this registration.

Best regards,
PMIS System
    """
    
    admin_emails = list(admins.values_list('email', flat=True))
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )
        print(f"[EMAIL] Admin notification sent to {len(admin_emails)} admins")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to notify admins: {e}")


def send_approval_notification(user):
    """Send approval notification to contractor."""
    subject = 'Account Approved - PMIS Zaheerabad Industrial Area'
    
    message = f"""
Dear {user.first_name} {user.last_name},

Congratulations! Your registration for PMIS has been approved.

You can now login to the system using your registered email and password.

Login URL: {getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/login

If you have any questions, please contact the PMNC team.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[EMAIL] Approval notification sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send approval notification to {user.email}: {e}")


def send_rejection_notification(user, reason):
    """Send rejection notification to contractor."""
    subject = 'Registration Not Approved - PMIS Zaheerabad Industrial Area'
    
    message = f"""
Dear {user.first_name} {user.last_name},

We regret to inform you that your registration for PMIS has not been approved.

Reason: {reason}

If you believe this is an error or would like to provide additional information, 
please contact the PMNC team.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[EMAIL] Rejection notification sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send rejection notification to {user.email}: {e}")
