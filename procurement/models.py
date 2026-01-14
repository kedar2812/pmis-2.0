from django.db import models
from django.conf import settings
import uuid


class Tender(models.Model):
    """
    Manages the tendering process for project work packages.
    Links to projects and schedule tasks for workflow alignment.
    """
    class TenderType(models.TextChoices):
        OPEN = 'OPEN', 'Open Tender'
        LIMITED = 'LIMITED', 'Limited Tender'
        SINGLE = 'SINGLE', 'Single Source'
        E_TENDER = 'E_TENDER', 'e-Tender (GeM/NICDC Portal)'

    class TenderStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        BID_OPEN = 'BID_OPEN', 'Bid Opening'
        EVALUATION = 'EVALUATION', 'Under Evaluation'
        AWARDED = 'AWARDED', 'Awarded'
        CANCELLED = 'CANCELLED', 'Cancelled'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender_no = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    
    # Project and Schedule Integration
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tenders'
    )
    schedule_task = models.ForeignKey(
        'scheduling.ScheduleTask',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tenders',
        help_text="Linked schedule milestone/task for workflow alignment"
    )
    work_package = models.ForeignKey(
        'projects.WorkPackage',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tenders'
    )
    
    # Financial Details
    estimated_value = models.DecimalField(max_digits=15, decimal_places=2)
    earnest_money_deposit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Tender Configuration
    tender_type = models.CharField(max_length=20, choices=TenderType.choices, default=TenderType.OPEN)
    status = models.CharField(max_length=20, choices=TenderStatus.choices, default=TenderStatus.DRAFT)
    
    # Timeline
    publish_date = models.DateField(null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True)
    bid_opening_date = models.DateTimeField(null=True, blank=True)
    
    # NICDC Portal Integration
    nicdc_portal_ref = models.CharField(max_length=100, null=True, blank=True, help_text="Reference ID from NICDC Procurement Portal")
    
    # Audit
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tenders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tender_no} - {self.title}"


class Bid(models.Model):
    """
    Bid submissions and evaluation for tenders.
    Links to Contractor master data.
    """
    class BidStatus(models.TextChoices):
        SUBMITTED = 'SUBMITTED', 'Submitted'
        TECHNICAL_EVAL = 'TECHNICAL_EVAL', 'Technical Evaluation'
        FINANCIAL_EVAL = 'FINANCIAL_EVAL', 'Financial Evaluation'
        QUALIFIED = 'QUALIFIED', 'Qualified'
        DISQUALIFIED = 'DISQUALIFIED', 'Disqualified'
        AWARDED = 'AWARDED', 'Awarded'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='bids')
    
    # Bidder (linked to Contractor master)
    bidder = models.ForeignKey(
        'masters.Contractor',
        on_delete=models.CASCADE,
        related_name='bids'
    )
    
    # Bid Details
    bid_amount = models.DecimalField(max_digits=15, decimal_places=2)
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    financial_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    combined_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=BidStatus.choices, default=BidStatus.SUBMITTED)
    
    # Timeline
    submission_date = models.DateTimeField(auto_now_add=True)
    evaluation_date = models.DateTimeField(null=True, blank=True)
    
    # Remarks
    technical_remarks = models.TextField(blank=True)
    financial_remarks = models.TextField(blank=True)
    
    # Audit
    evaluated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='evaluated_bids')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-combined_score', 'bid_amount']
        unique_together = ['tender', 'bidder']

    def __str__(self):
        return f"Bid by {self.bidder.name} for {self.tender.tender_no}"


class Contract(models.Model):
    """
    Contract lifecycle management.
    Links tender award to execution with schedule integration.
    """
    class ContractStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SIGNED = 'SIGNED', 'Signed'
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        COMPLETED = 'COMPLETED', 'Completed'
        TERMINATED = 'TERMINATED', 'Terminated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_no = models.CharField(max_length=50, unique=True)
    
    # Source
    tender = models.OneToOneField(Tender, on_delete=models.CASCADE, related_name='contract')
    winning_bid = models.OneToOneField(Bid, on_delete=models.SET_NULL, null=True, related_name='awarded_contract')
    
    # Parties
    contractor = models.ForeignKey(
        'masters.Contractor',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    
    # Financial
    contract_value = models.DecimalField(max_digits=15, decimal_places=2)
    revised_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    performance_guarantee = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Schedule Integration
    schedule_task = models.ForeignKey(
        'scheduling.ScheduleTask',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='contracts',
        help_text="Linked milestone - payments tied to schedule progress"
    )
    
    # Timeline
    signing_date = models.DateField(null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    revised_end_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.DRAFT)
    
    # Audit
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_contracts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_no} - {self.contractor.name}"
    
    @property
    def total_variations(self):
        return self.variations.aggregate(total=models.Sum('amount'))['total'] or 0
    
    @property
    def current_value(self):
        return self.contract_value + self.total_variations


class Variation(models.Model):
    """
    Variation/Change Order management.
    Tracks scope and cost changes to contracts.
    """
    class VariationStatus(models.TextChoices):
        PROPOSED = 'PROPOSED', 'Proposed'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        IMPLEMENTED = 'IMPLEMENTED', 'Implemented'

    class VariationType(models.TextChoices):
        SCOPE_CHANGE = 'SCOPE_CHANGE', 'Scope Change'
        TIME_EXTENSION = 'TIME_EXTENSION', 'Time Extension'
        PRICE_ADJUSTMENT = 'PRICE_ADJUSTMENT', 'Price Adjustment'
        QUANTITY_VARIATION = 'QUANTITY_VARIATION', 'Quantity Variation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='variations')
    
    variation_no = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    variation_type = models.CharField(max_length=30, choices=VariationType.choices)
    
    # Impact
    amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Cost impact (+/-)")
    time_impact_days = models.IntegerField(default=0, help_text="Schedule impact in days")
    
    # Schedule Integration
    affected_task = models.ForeignKey(
        'scheduling.ScheduleTask',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='variations',
        help_text="Schedule task affected by this variation"
    )
    
    status = models.CharField(max_length=20, choices=VariationStatus.choices, default=VariationStatus.PROPOSED)
    
    # Approval
    proposed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='proposed_variations')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_variations')
    approved_date = models.DateField(null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['contract', 'variation_no']

    def __str__(self):
        return f"{self.variation_no} - {self.title}"
