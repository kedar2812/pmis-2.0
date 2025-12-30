"""
Enhanced Email Service with HTML Templates
Uses Gmail SMTP for sending professional-looking emails
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_invite_email(user, invite_url):
    """Send invite email to internal user with HTML template."""
    subject = 'You have been invited to PMIS - Zaheerabad Industrial Area'
    
    # Plain text version
    text_content = f"""
Dear {user.first_name} {user.last_name},

You have been invited to join the Programme Management Information System (PMIS) 
for Zaheerabad Industrial Area.

Your Role: {user.get_role_display()}
Department: {user.department or 'N/A'}
Username: {user.username}

Please click the link below to set your password and activate your account:
{invite_url}

This link will expire in 24 hours.

If you did not expect this invitation, please ignore this email.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PMIS Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">PMIS Invitation</h1>
                            <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Zaheerabad Industrial Area</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                                Dear <strong>{user.first_name} {user.last_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                                You have been invited to join the <strong>Programme Management Information System (PMIS)</strong> for Zaheerabad Industrial Area.
                            </p>
                            
                            <table role="presentation" style="width: 100%; background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 4px 0;">
                                        <strong style="color: #1f2937;">Your Role:</strong>
                                        <span style="color: #374151;">{user.get_role_display()}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0;">
                                        <strong style="color: #1f2937;">Department:</strong>
                                        <span style="color: #374151;">{user.department or 'N/A'}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0;">
                                        <strong style="color: #1f2937;">Username:</strong>
                                        <span style="color: #374151;">{user.username}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                                Please click the button below to set your password and activate your account:
                            </p>
                            
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="{invite_url}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Activate My Account
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                This link will expire in <strong>24 hours</strong>.
                            </p>
                            
                            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                If you did not expect this invitation, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                                <strong>PMIS Administration</strong><br>
                                Zaheerabad Industrial Area<br>
                                This is an automated message, please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        print(f"[EMAIL] Invite sent to {user.email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send invite to {user.email}: {e}")
        raise


def send_welcome_email(user):
    """Send welcome email after account activation."""
    subject = 'Welcome to PMIS - Account Activated'
    
    login_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/login"
    
    text_content = f"""
Dear {user.first_name} {user.last_name},

Welcome to PMIS! Your account has been successfully activated.

Your Account Details:
- Username: {user.username}
- Email: {user.email}
- Role: {user.get_role_display()}

You can now login to the system using your username or email and the password you just set.

Login URL: {login_url}

If you have any questions or need assistance, please contact the PMIS administration team.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome to PMIS!</h1>
                            <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px;">Your account is now active</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                                Dear <strong>{user.first_name} {user.last_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Welcome to the Programme Management Information System (PMIS)! Your account has been successfully activated.
                            </p>
                            
                            <table role="presentation" style="width: 100%; background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <tr><td style="padding: 4px 0;"><strong>Username:</strong> {user.username}</td></tr>
                                <tr><td style="padding: 4px 0;"><strong>Email:</strong> {user.email}</td></tr>
                                <tr><td style="padding: 4px 0;"><strong>Role:</strong> {user.get_role_display()}</td></tr>
                            </table>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">
                                You can now login to the system using your username or email and the password you set.
                            </p>
                            
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="{login_url}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Login to PM IS
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
                                If you need assistance, please contact the PMIS administration team.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                <strong>PMIS Administration</strong><br>
                                Zaheerabad Industrial Area
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    try:
        email = EmailMultiAlternatives(subject=subject, body=text_content, from_email=settings.DEFAULT_FROM_EMAIL, to=[user.email])
        email.attach_alternative(html_content, "text/html")
        email.send()
        print(f"[EMAIL] Welcome email sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send welcome email to {user.email}: {e}")


def send_registration_confirmation(user):
    """Send confirmation email after contractor registration."""
    subject = 'Registration Received - PMIS Zaheerabad Industrial Area'
    
    text_content = f"""
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
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Registration Received</h1>
                            <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px;">PMIS - Zaheerabad Industrial Area</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                                Dear <strong>{user.first_name} {user.last_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Thank you for registering on the Programme Management Information System (PMIS). Your registration has been received and is <strong>pending approval</strong> by our administrators.
                            </p>
                            
                            <table role="presentation" style="width: 100%; background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <tr><td style="padding: 4px 0;"><strong>Company:</strong> {user.company_name}</td></tr>
                                <tr><td style="padding: 4px 0;"><strong>PAN:</strong> {user.pan_number}</td></tr>
                                <tr><td style="padding: 4px 0;"><strong>GSTIN:</strong> {user.gstin_number}</td></tr>
                                <tr><td style="padding: 4px 0;"><strong>Email:</strong> {user.email}</td></tr>
                            </table>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                You will receive another email once your account has been reviewed and activated.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                <strong>PMIS Administration</strong><br>
                                Zaheerabad Industrial Area
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    try:
        email = EmailMultiAlternatives(subject=subject, body=text_content, from_email=settings.DEFAULT_FROM_EMAIL, to=[user.email])
        email.attach_alternative(html_content, "text/html")
        email.send()
        print(f"[EMAIL] Registration confirmation sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send confirmation to {user.email}: {e}")


def notify_admins_new_registration(user):
    """Notify admin users about new contractor registration."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    admins = User.objects.filter(role__in=['SPV_Official', 'PMNC_Team'], is_active=True, account_status='ACTIVE')
    
    if not admins.exists():
        print("[EMAIL] No admin users found to notify")
        return
    
    subject = f'New Contractor Registration Pending Approval - {user.company_name}'
    
    text_content = f"""
A new contractor has registered on PMIS and requires approval.

Company Details:
- Name: {user.company_name}
- Contact: {user.first_name} {user.last_name}
- Email: {user.email}
- Phone: {user.phone_number}
- PAN: {user.pan_number}
- GSTIN: {user.gstin_number}

Please login to PM IS to review and approve/reject this registration.

Best regards,
PMIS System
    """
    
    admin_emails = list(admins.values_list('email', flat=True))
    
    try:
        from django.core.mail import send_mail
        send_mail(subject=subject, message=text_content, from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=admin_emails, fail_silently=False)
        print(f"[EMAIL] Admin notification sent to {len(admin_emails)} admins")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to notify admins: {e}")


def send_approval_notification(user):
    """Send approval notification to contractor."""
    subject = 'Account Approved - PMIS Zaheerabad Industrial Area'
    
    login_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/login"
    
    text_content = f"""
Dear {user.first_name} {user.last_name},

Congratulations! Your registration for PMIS has been approved.

You can now login to the system using your registered email and password.

Login URL: {login_url}

If you have any questions, please contact the PMNC team.

Best regards,
PMIS Administration
Zaheerabad Industrial Area
    """
    
    try:
        from django.core.mail import send_mail
        send_mail(subject=subject, message=text_content, from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[user.email], fail_silently=False)
        print(f"[EMAIL] Approval notification sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send approval notification to {user.email}: {e}")


def send_rejection_notification(user, reason):
    """Send rejection notification to contractor."""
    subject = 'Registration Not Approved - PMIS Zaheerabad Industrial Area'
    
    text_content = f"""
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
        from django.core.mail import send_mail
        send_mail(subject=subject, message=text_content, from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[user.email], fail_silently=False)
        print(f"[EMAIL] Rejection notification sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send rejection notification to {user.email}: {e}")
