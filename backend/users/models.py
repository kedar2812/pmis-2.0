from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    class Roles(models.TextChoices):
        SPV_OFFICIAL = 'SPV_Official', 'SPV Official'
        PMNC_TEAM = 'PMNC_Team', 'PMNC Team'
        EPC_CONTRACTOR = 'EPC_Contractor', 'EPC Contractor'
        CONSULTANT_DESIGN = 'Consultant_Design', 'Design Consultant'
        GOVT_DEPARTMENT = 'Govt_Department', 'Government Department'
        NICDC_HQ = 'NICDC_HQ', 'NICDC HQ'
    
    class AccountStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PENDING_INVITE = 'PENDING_INVITE', 'Pending Invite Acceptance'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Admin Approval'
        DISABLED = 'DISABLED', 'Disabled'

    # Core Role Field
    role = models.CharField(
        max_length=50,
        choices=Roles.choices,
        default=Roles.SPV_OFFICIAL,
        help_text="Designates the functional role of the user."
    )
    
    # Account Status (for invite/approval workflow)
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        help_text="Current status of the user account."
    )
    
    # Invite Token (for internal user invite workflow)
    invite_token = models.UUIDField(null=True, blank=True, unique=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Approval Tracking (for contractor approval workflow)
    approved_by = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='approved_users'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    
    # Basic Contact Info
    department = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    
    # Contractor-Specific Fields (populated only for EPC_Contractor role)
    contractor_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text="Internal Contractor Profile ID"
    )
    
    # Legal Identifiers
    pan_number = models.CharField(max_length=10, blank=True, null=True, help_text="PAN Number")
    gstin_number = models.CharField(max_length=15, blank=True, null=True, help_text="GSTIN Number")
    eproc_number = models.CharField(max_length=50, blank=True, null=True, help_text="e-Procurement Number")
    
    # Company Details
    company_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Address (Split Fields)
    building_number = models.CharField(max_length=100, blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    area = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True, default='India')
    zip_code = models.CharField(max_length=10, blank=True, null=True)
    
    # Bank Details (Required for Bill Payment module)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_branch = models.CharField(max_length=255, blank=True, null=True)
    ifsc_code = models.CharField(max_length=11, blank=True, null=True, help_text="IFSC Code")
    account_number = models.CharField(max_length=20, blank=True, null=True)
    account_type = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        choices=[
            ('SAVINGS', 'Savings'),
            ('CURRENT', 'Current'),
            ('OTHER', 'Other'),
        ]
    )
    
    # User Presence Tracking
    last_seen = models.DateTimeField(null=True, blank=True, help_text="Last activity timestamp")
    is_online = models.BooleanField(default=False, help_text="Currently active status")
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def full_address(self):
        """Returns formatted full address."""
        parts = [
            self.building_number,
            self.street,
            self.area,
            self.city,
            self.state,
            self.country,
            self.zip_code
        ]
        return ', '.join(filter(None, parts))
    
    @property
    def is_contractor(self):
        return self.role == self.Roles.EPC_CONTRACTOR
    
    @property
    def can_login(self):
        """Check if user is allowed to login."""
        return self.account_status == self.AccountStatus.ACTIVE and self.is_active
    
    def generate_invite_token(self):
        """Generate a new invite token."""
        from django.utils import timezone
        from datetime import timedelta
        
        self.invite_token = uuid.uuid4()
        self.invite_expires_at = timezone.now() + timedelta(days=1)  # 24 hour expiry
        self.save(update_fields=['invite_token', 'invite_expires_at'])
        return self.invite_token
    
    def accept_invite(self, password):
        """Accept invite and set password."""
        from django.utils import timezone
        
        if not self.invite_token:
            raise ValueError("No invite token found.")
        
        if self.invite_expires_at and timezone.now() > self.invite_expires_at:
            raise ValueError("Invite link has expired.")
        
        self.set_password(password)
        self.account_status = self.AccountStatus.ACTIVE
        self.is_active = True  # Enable login
        self.invite_token = None
        self.invite_expires_at = None
        self.save()
