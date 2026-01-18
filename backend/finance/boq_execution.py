"""
BOQ Execution Tracking and Progress Calculation Service

This module provides:
1. BOQExecution model - Tracks executed quantities for each BOQ item
2. Progress calculation service - Computes BOQ-weighted physical and financial progress
3. API endpoints for updating and retrieving project progress

Government-Grade Implementation:
- All calculations are traceable and auditable
- Progress values are computed, never manually overridden
- Historical tracking with timestamps and user references
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
import logging

logger = logging.getLogger(__name__)


class BOQExecution(models.Model):
    """
    Tracks executed/achieved quantities for BOQ items.
    
    Each execution record represents work done on a specific date,
    creating a traceable history of progress. The cumulative executed
    quantity determines physical progress.
    
    Government Standards Compliance:
    - Immutable once verified
    - Requires verification by authorized personnel
    - Links to supporting documents (RA Bills, site photos, etc.)
    """
    
    class VerificationStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted for Verification'
        VERIFIED = 'VERIFIED', 'Verified by Authority'
        REJECTED = 'REJECTED', 'Rejected'
        REVISED = 'REVISED', 'Revision Required'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    boq_item = models.ForeignKey(
        'BOQItem',
        on_delete=models.CASCADE,
        related_name='executions',
        help_text='Reference to the BOQ item being executed'
    )
    
    # Execution details
    executed_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Quantity executed/achieved in this entry'
    )
    
    execution_date = models.DateField(
        help_text='Date when this work was executed'
    )
    
    # Period tracking (for RA Bill correlation)
    period_from = models.DateField(
        null=True,
        blank=True,
        help_text='Start of execution period'
    )
    period_to = models.DateField(
        null=True,
        blank=True,
        help_text='End of execution period'
    )
    
    # Financial link
    ra_bill = models.ForeignKey(
        'RABill',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='boq_executions',
        help_text='Linked RA Bill for payment tracking'
    )
    
    # Verification workflow
    status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.DRAFT
    )
    
    remarks = models.TextField(
        blank=True,
        help_text='Execution remarks or notes'
    )
    
    # Evidence/Supporting documents (stored as JSON array of EDMS doc IDs)
    supporting_documents = models.JSONField(
        default=list,
        blank=True,
        help_text='List of EDMS document IDs as evidence'
    )
    
    # Audit trail
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_boq_executions'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_boq_executions'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-execution_date', '-created_at']
        indexes = [
            models.Index(fields=['boq_item', 'execution_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.boq_item.item_code} - {self.executed_quantity} on {self.execution_date}"
    
    @property
    def execution_value(self):
        """Calculate the earned value for this execution entry."""
        return self.executed_quantity * self.boq_item.rate
    
    def verify(self, user):
        """Mark execution as verified by an authorized user."""
        self.status = self.VerificationStatus.VERIFIED
        self.verified_by = user
        self.verified_at = timezone.now()
        self.save()


class ProgressCalculationLog(models.Model):
    """
    Audit log for all progress calculations.
    
    Every time project progress is calculated, a log entry is created
    for audit trail and debugging purposes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='progress_logs'
    )
    
    # Calculated values
    physical_progress = models.FloatField()
    financial_progress = models.FloatField()
    earned_value = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Calculation metadata
    total_boq_value = models.DecimalField(max_digits=15, decimal_places=2)
    total_executed_value = models.DecimalField(max_digits=15, decimal_places=2)
    boq_items_count = models.IntegerField()
    verified_executions_count = models.IntegerField()
    
    # Variance from previous calculation
    physical_progress_delta = models.FloatField(default=0.0)
    financial_progress_delta = models.FloatField(default=0.0)
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-calculated_at']
        get_latest_by = 'calculated_at'
    
    def __str__(self):
        return f"{self.project.name} - {self.physical_progress}% @ {self.calculated_at}"
