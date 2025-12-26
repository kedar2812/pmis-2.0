from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

class FundHead(models.Model):
    """
    Tracks the source of funds (e.g., Grants, Loans, Budget Allocations).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="e.g. World Bank Loan, State Budget")
    allocating_authority = models.CharField(max_length=255, help_text="e.g. Dept of Finance", default="Government")
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    balance_available = models.DecimalField(max_digits=15, decimal_places=2, blank=True)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.balance_available is None:
            self.balance_available = self.total_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (₹{self.balance_available})"

class ProjectFinanceSettings(models.Model):
    """
    Governance settings per project.
    """
    project = models.OneToOneField('projects.Project', on_delete=models.CASCADE, related_name='finance_settings')
    enable_auto_retention = models.BooleanField(default=True, help_text="Auto-calculate 5% retention on bills")
    default_retention_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    last_verified_at = models.DateTimeField(null=True, blank=True, help_text="For 30-Day Budget Pulse")

    def __str__(self):
        return f"Finance Settings: {self.project.name}"

class BudgetLineItem(models.Model):
    """
    Planned Cost tied strictly to a Milestone (Time).
    """
    class CostCategory(models.TextChoices):
        MATERIAL = 'MATERIAL', _('Material')
        LABOUR = 'LABOUR', _('Labour')
        MACHINERY = 'MACHINERY', _('Machinery')
        OVERHEAD = 'OVERHEAD', _('Overhead')
        PROFESSIONAL = 'PROFESSIONAL', _('Professional Fees')
        OTHER = 'OTHER', _('Other')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='budget_items')
    # Strict Linkage: Budget must have a milestone (No Money Without Time)
    milestone = models.ForeignKey('scheduling.ScheduleTask', on_delete=models.CASCADE, related_name='budget_allocations')
    fund_head = models.ForeignKey(FundHead, on_delete=models.CASCADE, related_name='allocations', null=True, blank=True)
    
    cost_category = models.CharField(max_length=50, choices=CostCategory.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.name} - {self.milestone.name}: {self.amount}"

class VariationRequest(models.Model):
    """
    Track changes to sanctioned budget.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    original_budget = models.ForeignKey(BudgetLineItem, on_delete=models.CASCADE, related_name='variations')
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class RABill(models.Model):
    """
    Running Account Bill - Digital Replica of Govt Excel Format.
    """
    class BillStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SUBMITTED = 'SUBMITTED', _('Submitted')
        VERIFIED = 'VERIFIED', _('Verified')
        APPROVED = 'APPROVED', _('Approved')
        PAID = 'PAID', _('Paid')

    class TDSType(models.TextChoices):
        C194_INDIVIDUAL = '194C_IND', _('194C - Individual/HUF')
        C194_OTHER = '194C_OTH', _('194C - Others')
        J194 = '194J', _('194J - Professional')
        NONE = 'NONE', _('None')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='ra_bills')
    contractor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='submitted_bills')
    
    # Must link to a specific milestone for Physical Progress Validation
    milestone = models.ForeignKey('scheduling.ScheduleTask', on_delete=models.SET_NULL, null=True, related_name='ra_bills')

    # Headers
    bill_no = models.CharField(max_length=50)
    work_order_no = models.CharField(max_length=100)
    bill_date = models.DateField()
    period_from = models.DateField(null=True, blank=True)
    period_to = models.DateField(null=True, blank=True)

    # Base Financials
    gross_amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Amount before GST")
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    gst_amount = models.DecimalField(max_digits=15, decimal_places=2)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Gross + GST")

    # Statutory Deductions
    tds_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    tds_section_type = models.CharField(max_length=20, choices=TDSType.choices, default=TDSType.NONE)

    labour_cess_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    labour_cess_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Retention / Security
    retention_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    retention_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Recoveries
    mobilization_advance_recovery = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    material_advance_recovery = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    plant_machinery_recovery = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Other Actions
    penalty_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_deductions = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    other_deduction_remarks = models.CharField(max_length=255, blank=True)

    # Final
    net_payable = models.DecimalField(max_digits=15, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=BillStatus.choices, default=BillStatus.DRAFT)
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Store override flags or extra sync data")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"RA Bill #{self.bill_no} - {self.net_payable}"

class RetentionLedger(models.Model):
    """
    Tracks retention money held per bill.
    """
    class Status(models.TextChoices):
        HELD = 'HELD', _('Held')
        RELEASED = 'RELEASED', _('Released')

    bill = models.OneToOneField(RABill, on_delete=models.CASCADE, related_name='retention_ledger')
    amount_held = models.DecimalField(max_digits=15, decimal_places=2)
    amount_released = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HELD)
    
    release_date = models.DateField(null=True, blank=True)

class BOQItem(models.Model):
    """
    Contract Baseline: The Sanctioned Bill of Quantities.
    Immutable once 'FROZEN'.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        FROZEN = 'FROZEN', _('Frozen (Immutable)')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='boq_items')
    
    item_code = models.CharField(max_length=50, help_text="e.g. 2.1.1")
    description = models.TextField()
    uom = models.CharField(max_length=20, help_text="Unit of Measurement")
    
    quantity = models.DecimalField(max_digits=15, decimal_places=4)
    rate = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Qty * Rate")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Prevent duplicates of item code per project
        unique_together = ['project', 'item_code']
        ordering = ['item_code']

    def save(self, *args, **kwargs):
        # Auto-calculate amount
        self.amount = self.quantity * self.rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_code} - {self.description[:50]}..."

class BOQMilestoneMapping(models.Model):
    """
    Budgeting Link: Money (BOQ) <-> Time (Schedule).
    Allows mapping a percentage of a BOQ Item to a specific Milestone.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    boq_item = models.ForeignKey(BOQItem, on_delete=models.CASCADE, related_name='milestone_mappings')
    milestone = models.ForeignKey('scheduling.ScheduleTask', on_delete=models.CASCADE, related_name='boq_mappings')
    
    percentage_allocated = models.DecimalField(
        max_digits=5, decimal_places=2, 
        help_text="How much of this BOQ item is consumed by this milestone?"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A BOQ item can be mapped to multiple milestones, but not the same one twice
        unique_together = ['boq_item', 'milestone']

    def __str__(self):
        return f"{self.boq_item.item_code} -> {self.milestone.name} ({self.percentage_allocated}%)"

