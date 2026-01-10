from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid


class ScheduleTask(models.Model):
    """
    Represents a Task or Milestone in the Project Schedule (WBS).
    Finance module links strictly to these for 'No Money Without Time'.
    
    Progress Tracking:
    - Progress is COMPUTED, not manually entered.
    - Calculation method is defined by `progress_method`.
    - Weight determines contribution to project-level aggregation.
    """
    
    # ========== ENUMS ==========
    class TaskStatus(models.TextChoices):
        PLANNED = 'PLANNED', 'Planned'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        DELAYED = 'DELAYED', 'Delayed'
    
    class ProgressMethod(models.TextChoices):
        """
        Defines how task progress is calculated.
        - QUANTITY: Progress = executed_quantity / planned_quantity
        - MILESTONE: Progress = 0 or 100 based on milestone approval
        - COST: Progress = actual_cost / budgeted_cost
        - TIME: Progress = elapsed_days / total_duration
        - MANUAL: Restricted manual entry (requires justification)
        """
        QUANTITY = 'QUANTITY', 'Quantity-Based'
        MILESTONE = 'MILESTONE', 'Milestone-Based'
        COST = 'COST', 'Cost-Based'
        TIME = 'TIME', 'Time-Based'
        MANUAL = 'MANUAL', 'Manual (Restricted)'
    
    class WeightSource(models.TextChoices):
        """
        Tracks how the task weight was determined.
        Priority: QUANTITY > COST > MANUAL > DURATION
        """
        QUANTITY = 'QUANTITY', 'Derived from Quantity'
        COST = 'COST', 'Derived from Cost'
        MANUAL = 'MANUAL', 'Manually Assigned'
        DURATION = 'DURATION', 'Derived from Duration (Fallback)'
        UNRESOLVED = 'UNRESOLVED', 'Not Yet Resolved'

    # ========== PRIMARY KEY ==========
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # ========== RELATIONSHIPS ==========
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tasks'
    )
    parent_task = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subtasks',
        help_text='Parent task for WBS hierarchy'
    )
    
    # ========== BASIC INFO ==========
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    wbs_code = models.CharField(
        max_length=50, 
        blank=True, 
        default='',
        help_text='Work Breakdown Structure code (e.g., 1.2.3)'
    )
    
    # ========== SCHEDULE ==========
    start_date = models.DateField()
    end_date = models.DateField()
    
    # ========== PROGRESS METHOD & WEIGHT ==========
    progress_method = models.CharField(
        max_length=20,
        choices=ProgressMethod.choices,
        default=ProgressMethod.QUANTITY,
        help_text='Method used to calculate task progress'
    )
    
    weight = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Weight for project-level aggregation. Null = unresolved.'
    )
    
    weight_source = models.CharField(
        max_length=20,
        choices=WeightSource.choices,
        default=WeightSource.UNRESOLVED,
        help_text='How the weight was determined'
    )
    
    # ========== QUANTITY-BASED PROGRESS ==========
    planned_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text='Planned quantity for quantity-based progress'
    )
    
    executed_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Actual executed quantity'
    )
    
    uom = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Unit of Measurement (e.g., m3, kg, nos)'
    )
    
    # ========== COST-BASED PROGRESS & EARNED VALUE ==========
    budgeted_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Budgeted Cost of Work Scheduled (BCWS) for EV calculations'
    )
    
    actual_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Actual Cost of Work Performed (ACWP)'
    )
    
    # ========== COMPUTED PROGRESS (READ-ONLY) ==========
    computed_progress = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='System-calculated progress percentage (0-100). DO NOT EDIT DIRECTLY.'
    )
    
    # ========== CAPPING & VALIDATION ==========
    max_progress_without_approval = models.FloatField(
        default=70.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='Progress cap until milestone/approval is complete'
    )
    
    is_approval_granted = models.BooleanField(
        default=False,
        help_text='If True, progress can exceed the cap (up to 100%)'
    )
    
    # ========== MANUAL PROGRESS (RESTRICTED) ==========
    manual_progress_value = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='Only used if progress_method is MANUAL'
    )
    
    manual_progress_justification = models.TextField(
        blank=True,
        default='',
        help_text='Required justification when using manual progress'
    )
    
    # ========== MILESTONE FLAGS ==========
    is_milestone = models.BooleanField(default=False)
    is_critical = models.BooleanField(
        default=False,
        help_text='True if this task is on the critical path'
    )
    
    # ========== IMPORT SUPPORT ==========
    external_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        help_text='UID from P6/MSP/Excel'
    )
    metadata = models.JSONField(
        default=dict, 
        blank=True, 
        help_text='Custom columns from imported files'
    )
    
    # ========== STATUS & AUDIT ==========
    status = models.CharField(
        max_length=20, 
        choices=TaskStatus.choices, 
        default=TaskStatus.PLANNED
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date', 'wbs_code', 'name']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['project', 'is_milestone']),
        ]

    def __str__(self):
        return f"{self.name} ({self.computed_progress:.1f}%)"

    @property
    def duration_days(self):
        """Calculate task duration in days."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

    @property
    def effective_progress(self):
        """
        Returns progress capped by approval status.
        If approval is not granted, progress is capped at max_progress_without_approval.
        """
        if self.is_approval_granted:
            return self.computed_progress
        return min(self.computed_progress, self.max_progress_without_approval)

    @property
    def earned_value(self):
        """
        Earned Value (EV) = Progress% × Budgeted Cost
        Uses effective_progress which respects the cap.
        """
        return Decimal(str(self.effective_progress / 100)) * self.budgeted_cost

    def calculate_progress(self):
        """
        Calculate progress based on the configured method.
        This method is called by the ProjectProgressCalculator service.
        Returns a float between 0.0 and 100.0.
        """
        if self.progress_method == self.ProgressMethod.QUANTITY:
            if self.planned_quantity and self.planned_quantity > 0:
                progress = (self.executed_quantity / self.planned_quantity) * 100
                return min(float(progress), 100.0)
            return 0.0
        
        elif self.progress_method == self.ProgressMethod.MILESTONE:
            # Milestones are binary: 0% or 100%
            return 100.0 if self.is_approval_granted else 0.0
        
        elif self.progress_method == self.ProgressMethod.COST:
            if self.budgeted_cost and self.budgeted_cost > 0:
                progress = (self.actual_cost / self.budgeted_cost) * 100
                return min(float(progress), 100.0)
            return 0.0
        
        elif self.progress_method == self.ProgressMethod.TIME:
            from django.utils import timezone
            today = timezone.now().date()
            if self.start_date and self.end_date:
                total_duration = (self.end_date - self.start_date).days
                if total_duration <= 0:
                    return 100.0 if today >= self.end_date else 0.0
                elapsed = (today - self.start_date).days
                progress = (elapsed / total_duration) * 100
                return min(max(float(progress), 0.0), 100.0)
            return 0.0
        
        elif self.progress_method == self.ProgressMethod.MANUAL:
            if self.manual_progress_value is not None:
                return float(self.manual_progress_value)
            return 0.0
        
        return 0.0

    def resolve_weight(self):
        """
        Resolve weight based on priority: QUANTITY > COST > MANUAL > DURATION.
        Returns (weight_value, weight_source) tuple.
        Called by the ProjectProgressCalculator service.
        """
        # Priority 1: Quantity-derived weight (if quantity method with valid data)
        if self.progress_method == self.ProgressMethod.QUANTITY and self.planned_quantity:
            return Decimal(str(self.planned_quantity)), self.WeightSource.QUANTITY
        
        # Priority 2: Cost-based weight
        if self.budgeted_cost and self.budgeted_cost > 0:
            return self.budgeted_cost, self.WeightSource.COST
        
        # Priority 3: Manually assigned weight
        if self.weight and self.weight_source == self.WeightSource.MANUAL:
            return self.weight, self.WeightSource.MANUAL
        
        # Priority 4: Duration-based weight (fallback)
        duration = self.duration_days
        if duration > 0:
            return Decimal(str(duration)), self.WeightSource.DURATION
        
        # Unresolved
        return None, self.WeightSource.UNRESOLVED
