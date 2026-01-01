"""
Entity Models for Contractors
Links to existing BankBranch model in banks app
"""
from django.db import models
import uuid


class Contractor(models.Model):
    """Registered contractor/vendor master"""
    TYPE_CHOICES = [
        ('Proprietorship', 'Proprietorship'),
        ('Partnership', 'Partnership'),
        ('Private Limited', 'Private Limited'),
        ('Public Limited', 'Public Limited'),
        ('LLP', 'Limited Liability Partnership'),
        ('Government', 'Government Entity'),
        ('Other', 'Other'),
    ]
    
    CLASS_CHOICES = [
        ('Class A', 'Class A (Unlimited)'),
        ('Class B', 'Class B (Up to ₹50 Cr)'),
        ('Class C', 'Class C (Up to ₹10 Cr)'),
        ('Class D', 'Class D (Up to ₹2 Cr)'),
        ('Class E', 'Class E (Up to ₹50 Lakh)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., C-10025")
    name = models.CharField(max_length=500, help_text="Full legal name of contractor/firm")
    contractor_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='Proprietorship')
    registration_class = models.CharField(max_length=20, choices=CLASS_CHOICES, blank=True)
    registration_number = models.CharField(max_length=100, blank=True, help_text="Official registration/license number")
    
    # Tax details
    pan = models.CharField(max_length=10, blank=True, help_text="10-digit PAN")
    gstin = models.CharField(max_length=15, blank=True, help_text="15-digit GSTIN")
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=2.00, help_text="TDS percentage")
    
    # Contact
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True, help_text="Registered address")
    
    # Bank accounts - M2M to BankBranch
    bank_accounts = models.ManyToManyField(
        'banks.BankBranch',
        through='ContractorBankAccount',
        related_name='contractors',
        blank=True
    )
    
    # Status
    blacklisted = models.BooleanField(default=False, help_text="Barred from bidding")
    blacklist_reason = models.TextField(blank=True)
    validity_date = models.DateField(null=True, blank=True, help_text="Registration validity")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_contractor'
        ordering = ['name']
        verbose_name = 'Contractor'
        verbose_name_plural = 'Contractors'

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def is_valid(self):
        """Check if contractor registration is still valid"""
        from django.utils import timezone
        if not self.validity_date:
            return True
        return self.validity_date >= timezone.now().date()


class ContractorBankAccount(models.Model):
    """Through model for Contractor-Bank relationship with account number"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.CASCADE,
        related_name='bank_account_details'
    )
    bank_branch = models.ForeignKey(
        'banks.BankBranch',
        on_delete=models.PROTECT,
        related_name='contractor_accounts'
    )
    account_number = models.CharField(max_length=30, help_text="Bank account number")
    account_type = models.CharField(
        max_length=20,
        choices=[
            ('Current', 'Current Account'),
            ('Savings', 'Savings Account'),
        ],
        default='Current'
    )
    is_primary = models.BooleanField(default=False, help_text="Primary account for payments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'masters_contractor_bank_account'
        unique_together = ['contractor', 'account_number']
        verbose_name = 'Contractor Bank Account'
        verbose_name_plural = 'Contractor Bank Accounts'

    def __str__(self):
        return f"{self.contractor.name} - {self.bank_branch.bank_name} ({self.account_number[-4:]})"
