"""
ETP Master - Establishment, Tools & Plant Charges
Drives billing deductions and recoveries
"""
from django.db import models
import uuid


class ETPMaster(models.Model):
    """ETP charges configuration for billing calculations"""
    CHARGE_TYPE_CHOICES = [
        ('Deduction', 'Deduction'),
        ('Recovery', 'Recovery'),
        ('Levy', 'Levy'),
        ('Addition', 'Addition'),
    ]
    
    BASIS_CHOICES = [
        ('Gross Bill Value', 'Gross Bill Value'),
        ('Works Component Only', 'Works Component Only'),
        ('Material Cost', 'Material Cost'),
        ('Labour Cost', 'Labour Cost'),
        ('Net Payable', 'Net Payable'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, db_index=True, help_text="e.g., LABOUR-CESS")
    name = models.CharField(max_length=255, help_text="e.g., Labour Welfare Cess")
    
    charge_type = models.CharField(max_length=20, choices=CHARGE_TYPE_CHOICES, default='Deduction')
    rate_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=0,
        help_text="e.g., 1.000 for 1%"
    )
    basis_of_calculation = models.CharField(
        max_length=50,
        choices=BASIS_CHOICES,
        default='Gross Bill Value',
        help_text="Which amount to apply the percentage on"
    )
    
    # Policy reference
    effective_date = models.DateField(help_text="Date from which rate is applicable")
    govt_reference = models.CharField(max_length=255, blank=True, help_text="Circular/order number")
    account_head = models.CharField(max_length=100, blank=True, help_text="Internal finance ledger code")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_etp'
        ordering = ['charge_type', 'code']
        verbose_name = 'ETP Charge'
        verbose_name_plural = 'ETP Charges'

    def __str__(self):
        return f"{self.code} - {self.name} ({self.rate_percentage}%)"
    
    @classmethod
    def get_active_charges(cls, charge_type=None):
        """Get all active ETP charges, optionally filtered by type"""
        from django.utils import timezone
        qs = cls.objects.filter(is_active=True, effective_date__lte=timezone.now().date())
        if charge_type:
            qs = qs.filter(charge_type=charge_type)
        return qs
    
    def calculate_amount(self, base_amount):
        """Calculate the charge amount based on percentage"""
        from decimal import Decimal
        return (Decimal(str(base_amount)) * self.rate_percentage / Decimal('100')).quantize(Decimal('0.01'))
