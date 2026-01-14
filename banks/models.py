from django.db import models


class BankBranch(models.Model):
    """
    IFSC Master Data - Self-hosted from RBI official sources
    Data Source: National Payment Corporation of India (NPCI) via Razorpay GitHub
    """
    
    # Primary identification
    ifsc_code = models.CharField(
        max_length=11,
        primary_key=True,
        db_index=True,
        help_text="11-character IFSC code (Format: ABCD0123456)"
    )
    
    # Bank details
    bank_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Full name of the bank"
    )
    
    branch_name = models.CharField(
        max_length=255,
        help_text="Branch name"
    )
    
    # Location details
    address = models.TextField(
        blank=True,
        help_text="Complete branch address"
    )
    
    city = models.CharField(
        max_length=100,
        db_index=True,
        blank=True,
        help_text="City name"
    )
    
    district = models.CharField(
        max_length=100,
        blank=True,
        help_text="District name"
    )
    
    state = models.CharField(
        max_length=100,
        db_index=True,
        blank=True,
        help_text="State name"
    )
    
    # Contact details
    contact = models.CharField(
        max_length=50,
        blank=True,
        help_text="Branch contact number"
    )
    
    # Payment system participation
    rtgs = models.BooleanField(
        default=True,
        help_text="RTGS enabled"
    )
    
    neft = models.BooleanField(
        default=True,
        help_text="NEFT enabled"
    )
    
    imps = models.BooleanField(
        default=True,
        help_text="IMPS enabled"
    )
    
    upi = models.BooleanField(
        default=False,
        help_text="UPI enabled"
    )
    
    # Data management
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    data_source = models.CharField(
        max_length=100,
        default="NPCI/RBI via Razorpay",
        help_text="Source of the data"
    )
    last_verified = models.DateField(
        null=True,
        blank=True,
        help_text="Last date data was verified"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this branch is currently active"
    )
    
    class Meta:
        db_table = 'banks_ifsc'
        indexes = [
            models.Index(fields=['bank_name']),
            models.Index(fields=['city']),
            models.Index(fields=['state']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'Bank Branch (IFSC)'
        verbose_name_plural = 'Bank Branches (IFSC)'
        ordering = ['bank_name', 'branch_name']
    
    def __str__(self):
        return f"{self.ifsc_code} - {self.bank_name} ({self.branch_name})"
    
    @classmethod
    def get_unique_banks(cls):
        """Get list of unique bank names"""
        return cls.objects.filter(is_active=True).values_list('bank_name', flat=True).distinct().order_by('bank_name')
    
    @classmethod
    def search_by_ifsc(cls, ifsc_code):
        """Search branch by IFSC code"""
        return cls.objects.filter(ifsc_code=ifsc_code.upper(), is_active=True).first()
