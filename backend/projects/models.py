from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class Project(models.Model):
    """
    Core Project model with references to Master Data tables.
    
    Uses ForeignKey with SET_NULL to maintain data integrity while allowing
    flexibility when master records are deleted or not yet assigned.
    
    Progress Tracking:
    - physical_progress: Computed from task-level execution data.
    - financial_progress: Computed from earned value vs budget.
    - These fields are READ-ONLY and cannot be set via API or Admin.
    """
    
    # ========== STATUS CHOICES ==========
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
        ('Under Review', 'Under Review'),
    ]
    
    class ProgressState(models.TextChoices):
        """
        Indicates the verification state of progress values.
        - CLAIMED: Computed but not externally verified (default)
        - VERIFIED: Approved by Authority/PMC
        - FLAGGED: Rule violation or anomaly detected
        """
        CLAIMED = 'CLAIMED', 'Claimed'
        VERIFIED = 'VERIFIED', 'Verified'
        FLAGGED = 'FLAGGED', 'Flagged'

    # ========== BASIC INFORMATION ==========
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Planning')
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # ========== LEGACY PROGRESS (TO BE DEPRECATED) ==========
    progress = models.FloatField(
        default=0.0,
        help_text='DEPRECATED: Use physical_progress instead. Kept for backward compatibility.'
    )
    
    # ========== COMPUTED PROGRESS FIELDS (READ-ONLY) ==========
    physical_progress = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
        help_text='Computed physical progress (0-100%). DO NOT EDIT DIRECTLY.'
    )
    
    financial_progress = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
        help_text='Computed financial progress (EV/Budget %). DO NOT EDIT DIRECTLY.'
    )
    
    earned_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Computed Earned Value (EV). DO NOT EDIT DIRECTLY.'
    )
    
    progress_state = models.CharField(
        max_length=20,
        choices=ProgressState.choices,
        default=ProgressState.CLAIMED,
        help_text='Verification state of progress values'
    )
    
    schedule_variance = models.FloatField(
        default=0.0,
        help_text='Schedule variance percentage. Negative = behind schedule.'
    )
    
    # ========== FINANCIAL ==========
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    spent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    # ========== HIERARCHY (Master References) ==========
    zone = models.ForeignKey(
        'masters.Zone', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative zone'
    )
    circle = models.ForeignKey(
        'masters.Circle', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative circle'
    )
    division = models.ForeignKey(
        'masters.Division', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative division'
    )
    sub_division = models.ForeignKey(
        'masters.SubDivision', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative sub-division'
    )
    
    # ========== GEOGRAPHY (Master References) ==========
    district = models.ForeignKey(
        'masters.District', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project district'
    )
    town = models.ForeignKey(
        'masters.Town', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project town/city'
    )
    
    # ========== CLASSIFICATION (Master References) ==========
    scheme_type = models.ForeignKey(
        'masters.SchemeType', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Type of scheme'
    )
    scheme = models.ForeignKey(
        'masters.Scheme', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Specific scheme'
    )
    work_type = models.ForeignKey(
        'masters.WorkType', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Type of work'
    )
    project_category = models.ForeignKey(
        'masters.ProjectCategory', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project category classification'
    )
    
    # ========== LOCATION (Legacy + Map) ==========
    lat = models.FloatField(null=True, blank=True, help_text='Latitude for map display')
    lng = models.FloatField(null=True, blank=True, help_text='Longitude for map display')
    address = models.CharField(max_length=500, blank=True, help_text='Physical address or landmark')
    
    # ========== METADATA ==========
    manager_legacy = models.CharField(max_length=255, blank=True, null=True, help_text="Old manager field - will be migrated")
    manager = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
        help_text='Project Manager assigned to this project'
    )
    admin_approval_reference_no = models.CharField(
        max_length=100,
        blank=True,
        help_text='Administrative approval reference number'
    )
    admin_approval_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date of administrative approval'
    )
    admin_approval_document = models.FileField(
        upload_to='projects/approvals/%Y/%m/',
        null=True,
        blank=True,
        help_text='Uploaded approval document (PDF/Image)'
    )
    stakeholders = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=100, blank=True, help_text='Legacy category field')
    land_acquisition_status = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name
    
    @property
    def hierarchy_display(self):
        """Returns a formatted string of the administrative hierarchy."""
        parts = []
        if self.zone:
            parts.append(self.zone.name)
        if self.circle:
            parts.append(self.circle.name)
        if self.division:
            parts.append(self.division.name)
        return ' → '.join(parts) if parts else 'Not assigned'
    
    @property
    def location_display(self):
        """Returns a formatted location string."""
        parts = []
        if self.town:
            parts.append(self.town.name)
        if self.district:
            parts.append(self.district.name)
        return ', '.join(parts) if parts else self.address or 'Not specified'


class WorkPackage(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='work_packages')
    contractor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_packages')
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')
    
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Agreement Details
    agreement_no = models.CharField(max_length=100, blank=True, null=True)
    agreement_date = models.DateField(null=True, blank=True)
    responsible_staff = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.project.name})"


class FundingSource(models.Model):
    """
    Tracks funding sources/patterns for projects.
    Previously this data was sent from frontend but discarded by backend.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='fundings'
    )
    source = models.CharField(max_length=255, help_text="Funding source name/type")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    document = models.FileField(
        upload_to='projects/funding_docs/%Y/%m/',
        null=True,
        blank=True,
        help_text="Supporting document for this funding source"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.source}: ₹{self.amount} ({self.project.name})"

