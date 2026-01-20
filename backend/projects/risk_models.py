"""
Risk Management Models

Implements a comprehensive risk register with:
- Full lifecycle tracking (Identified → Assessed → Mitigating → Mitigated → Closed)
- Risk scoring matrix (probability × impact = 1-25 score)
- Severity auto-calculation (LOW/MEDIUM/HIGH/CRITICAL)
- EDMS integration for document storage
- Mitigation action tracking with mandatory proof documents
- Notification triggers for high-severity risks

Complies with government project management standards.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Risk(models.Model):
    """
    Core Risk Register entry with full lifecycle tracking,
    EDMS document integration, and notification triggers.
    
    Risk Score Calculation:
    - Score = Probability (1-5) × Impact (1-5) = 1-25
    - Severity thresholds: LOW(1-4), MEDIUM(5-9), HIGH(10-15), CRITICAL(16-25)
    """
    
    # ========== ENUMS ==========
    
    class Category(models.TextChoices):
        TECHNICAL = 'TECHNICAL', 'Technical'
        FINANCIAL = 'FINANCIAL', 'Financial'
        CONTRACTUAL = 'CONTRACTUAL', 'Contractual'
        ENVIRONMENTAL = 'ENVIRONMENTAL', 'Environmental'
        SAFETY = 'SAFETY', 'Safety'
        POLITICAL = 'POLITICAL', 'Political'
        LEGAL = 'LEGAL', 'Legal'
        OPERATIONAL = 'OPERATIONAL', 'Operational'
        SCHEDULE = 'SCHEDULE', 'Schedule/Timeline'
        RESOURCE = 'RESOURCE', 'Resource/Manpower'
        OTHER = 'OTHER', 'Other'
    
    class RiskSource(models.TextChoices):
        INTERNAL = 'INTERNAL', 'Internal'
        EXTERNAL = 'EXTERNAL', 'External'
    
    class Probability(models.IntegerChoices):
        VERY_LOW = 1, 'Very Low (Rare)'
        LOW = 2, 'Low (Unlikely)'
        MEDIUM = 3, 'Medium (Possible)'
        HIGH = 4, 'High (Likely)'
        VERY_HIGH = 5, 'Very High (Almost Certain)'
    
    class Impact(models.IntegerChoices):
        NEGLIGIBLE = 1, 'Negligible'
        MINOR = 2, 'Minor'
        MODERATE = 3, 'Moderate'
        MAJOR = 4, 'Major'
        CRITICAL = 5, 'Critical'
    
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'
    
    class Status(models.TextChoices):
        IDENTIFIED = 'IDENTIFIED', 'Identified'
        ASSESSED = 'ASSESSED', 'Assessed'
        MITIGATING = 'MITIGATING', 'Mitigating'
        MITIGATED = 'MITIGATED', 'Mitigated'
        CLOSED = 'CLOSED', 'Closed'
        OCCURRED = 'OCCURRED', 'Occurred'
        ACCEPTED = 'ACCEPTED', 'Accepted'
    
    class ResponseStrategy(models.TextChoices):
        AVOID = 'AVOID', 'Avoid'
        MITIGATE = 'MITIGATE', 'Mitigate'
        TRANSFER = 'TRANSFER', 'Transfer'
        ACCEPT = 'ACCEPT', 'Accept'
        ESCALATE = 'ESCALATE', 'Escalate'
    
    # ========== IDENTIFICATION ==========
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    risk_code = models.CharField(
        max_length=30, 
        unique=True, 
        blank=True,
        help_text="Auto-generated: RSK-{PROJECT_CODE}-{SEQ}"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # ========== CATEGORIZATION ==========
    
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER
    )
    risk_source = models.CharField(
        max_length=10,
        choices=RiskSource.choices,
        default=RiskSource.INTERNAL
    )
    
    # ========== ASSESSMENT ==========
    
    probability = models.IntegerField(
        choices=Probability.choices,
        default=Probability.MEDIUM,
        help_text="Likelihood of risk occurring (1-5)"
    )
    impact = models.IntegerField(
        choices=Impact.choices,
        default=Impact.MODERATE,
        help_text="Severity if risk occurs (1-5)"
    )
    risk_score = models.IntegerField(
        editable=False,
        default=9,
        help_text="Auto-calculated: probability × impact (1-25)"
    )
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        editable=False,
        default=Severity.MEDIUM,
        help_text="Auto-calculated from risk score"
    )
    
    # ========== STATUS & LIFECYCLE ==========
    
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.IDENTIFIED
    )
    identified_date = models.DateField(auto_now_add=True)
    target_resolution = models.DateField(
        null=True, 
        blank=True,
        help_text="Expected date to resolve/mitigate risk"
    )
    actual_closure = models.DateField(
        null=True, 
        blank=True,
        help_text="Date when risk was closed"
    )
    review_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Next scheduled review date"
    )
    
    # ========== RESPONSE PLAN ==========
    
    response_strategy = models.CharField(
        max_length=10,
        choices=ResponseStrategy.choices,
        null=True,
        blank=True
    )
    mitigation_plan = models.TextField(
        blank=True,
        help_text="Detailed plan to reduce probability/impact"
    )
    contingency_plan = models.TextField(
        blank=True,
        help_text="Actions if risk materializes"
    )
    cost_impact = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Estimated financial impact in INR"
    )
    schedule_impact_days = models.IntegerField(
        default=0,
        help_text="Estimated schedule delay in days"
    )
    residual_risk_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="Risk score after mitigation applied"
    )
    
    # ========== LINKAGES ==========
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='risks'
    )
    work_package = models.ForeignKey(
        'projects.WorkPackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='risks'
    )
    schedule_task = models.ForeignKey(
        'scheduling.ScheduleTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='risks',
        help_text="Linked schedule task affected by this risk"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_risks',
        help_text="Person responsible for managing this risk"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_risks'
    )
    
    # ========== EDMS INTEGRATION ==========
    
    edms_folder = models.ForeignKey(
        'edms.Folder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Auto-created folder: {Project}/Risk Management/{risk_code}"
    )
    
    # ========== AUDIT TRAIL ==========
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['owner', 'status']),
        ]
    
    def __str__(self):
        return f"{self.risk_code}: {self.title}"
    
    def save(self, *args, **kwargs):
        # Auto-generate risk code
        if not self.risk_code:
            self.risk_code = self._generate_risk_code()
        
        # Calculate risk score and severity
        self.risk_score = self.probability * self.impact
        self.severity = self._calculate_severity()
        
        # Set closure date when status changes to CLOSED
        if self.status == self.Status.CLOSED and not self.actual_closure:
            self.actual_closure = timezone.now().date()
        
        super().save(*args, **kwargs)
    
    def _generate_risk_code(self):
        """Generate unique risk code: RSK-{PROJECT_CODE}-{SEQ}"""
        project_code = self.project.code if hasattr(self.project, 'code') else str(self.project.id)[:6].upper()
        
        # Get next sequence number for this project
        last_risk = Risk.objects.filter(
            risk_code__startswith=f"RSK-{project_code}-"
        ).order_by('-created_at').first()
        
        if last_risk:
            try:
                last_seq = int(last_risk.risk_code.split('-')[-1])
                next_seq = last_seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1
        
        return f"RSK-{project_code}-{next_seq:04d}"
    
    def _calculate_severity(self):
        """Calculate severity based on risk score thresholds."""
        if self.risk_score >= 16:
            return self.Severity.CRITICAL
        elif self.risk_score >= 10:
            return self.Severity.HIGH
        elif self.risk_score >= 5:
            return self.Severity.MEDIUM
        else:
            return self.Severity.LOW
    
    @property
    def is_overdue(self):
        """Check if risk is overdue for resolution."""
        if self.target_resolution and self.status not in [self.Status.CLOSED, self.Status.MITIGATED]:
            return timezone.now().date() > self.target_resolution
        return False
    
    @property
    def days_open(self):
        """Number of days risk has been open."""
        if not self.identified_date:
            return 0
        end_date = self.actual_closure or timezone.now().date()
        return (end_date - self.identified_date).days
    
    @property
    def mitigation_count(self):
        """Number of mitigation actions taken."""
        return self.mitigation_actions.filter(status='APPROVED').count()


class RiskDocument(models.Model):
    """
    Links supporting documents to risks via EDMS.
    Documents are stored in: {Project}/Risk Management/{risk_code}/
    """
    
    class DocumentType(models.TextChoices):
        EVIDENCE = 'EVIDENCE', 'Evidence/Proof'
        ASSESSMENT = 'ASSESSMENT', 'Risk Assessment Report'
        MITIGATION_PLAN = 'MITIGATION_PLAN', 'Mitigation Plan'
        MITIGATION_PROOF = 'MITIGATION_PROOF', 'Mitigation Action Proof'
        CLOSURE_REPORT = 'CLOSURE_REPORT', 'Closure Report'
        INSURANCE = 'INSURANCE', 'Insurance Claim'
        MEETING_NOTES = 'MEETING_NOTES', 'Meeting Notes'
        CORRESPONDENCE = 'CORRESPONDENCE', 'Correspondence'
        INCIDENT_REPORT = 'INCIDENT_REPORT', 'Incident Report'
        OTHER = 'OTHER', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    risk = models.ForeignKey(
        Risk, 
        on_delete=models.CASCADE, 
        related_name='risk_documents'
    )
    document = models.ForeignKey(
        'edms.Document', 
        on_delete=models.CASCADE,
        related_name='risk_attachments'
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )
    notes = models.TextField(blank=True, help_text="Additional context for this document")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.risk.risk_code} - {self.document.title}"


class RiskMitigationAction(models.Model):
    """
    Tracks individual mitigation actions taken against a risk.
    Each action REQUIRES at least one supporting document as proof.
    
    Lifecycle:
    1. User creates action (DRAFT status)
    2. User uploads proof document(s) - MANDATORY
    3. User submits action (SUBMITTED status)
    4. Risk owner/manager reviews and approves (APPROVED/REJECTED)
    5. If approved, risk's residual score may be updated
    """
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted for Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    class ActionType(models.TextChoices):
        PREVENTIVE = 'PREVENTIVE', 'Preventive Action'
        CORRECTIVE = 'CORRECTIVE', 'Corrective Action'
        DETECTIVE = 'DETECTIVE', 'Detective Control'
        CONTINGENCY = 'CONTINGENCY', 'Contingency Measure'
        TRANSFER = 'TRANSFER', 'Risk Transfer (Insurance/Contract)'
        ACCEPTANCE = 'ACCEPTANCE', 'Risk Acceptance with Justification'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    risk = models.ForeignKey(
        Risk, 
        on_delete=models.CASCADE, 
        related_name='mitigation_actions'
    )
    
    # ========== ACTION DETAILS ==========
    
    action_number = models.PositiveIntegerField(
        help_text="Auto-incremented per risk"
    )
    action_type = models.CharField(
        max_length=15,
        choices=ActionType.choices,
        default=ActionType.CORRECTIVE
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # ========== DATES ==========
    
    action_date = models.DateField(
        help_text="Date when action was taken"
    )
    target_completion = models.DateField(
        null=True, 
        blank=True,
        help_text="Target date for action completion"
    )
    actual_completion = models.DateField(
        null=True, 
        blank=True,
        help_text="Actual completion date"
    )
    
    # ========== EFFECTIVENESS ASSESSMENT ==========
    
    effectiveness_rating = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=Not Effective, 3=Moderate, 5=Highly Effective"
    )
    residual_probability = models.IntegerField(
        null=True, 
        blank=True,
        choices=Risk.Probability.choices,
        help_text="Probability after this action"
    )
    residual_impact = models.IntegerField(
        null=True, 
        blank=True,
        choices=Risk.Impact.choices,
        help_text="Impact after this action"
    )
    
    # ========== COST ==========
    
    cost_incurred = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Cost incurred for this mitigation action"
    )
    
    # ========== WORKFLOW STATUS ==========
    
    status = models.CharField(
        max_length=12,
        choices=Status.choices, 
        default=Status.DRAFT
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL, 
        related_name='reviewed_mitigations'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comments = models.TextField(blank=True)
    
    # ========== TRACKING ==========
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_mitigations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-action_number']
        unique_together = ['risk', 'action_number']
        indexes = [
            models.Index(fields=['risk', 'status']),
        ]
    
    def __str__(self):
        return f"{self.risk.risk_code} - Action #{self.action_number}: {self.title}"
    
    def save(self, *args, **kwargs):
        # Auto-increment action number within risk
        if not self.action_number:
            from django.db.models import Max
            max_num = RiskMitigationAction.objects.filter(
                risk=self.risk
            ).aggregate(Max('action_number'))['action_number__max'] or 0
            self.action_number = max_num + 1
        super().save(*args, **kwargs)
    
    def submit(self):
        """
        Submit action for review.
        REQUIRES at least one proof document - enforced at API level.
        """
        if not self.proof_documents.exists():
            raise ValidationError(
                "Cannot submit mitigation action without proof documentation. "
                "Please upload at least one supporting document."
            )
        
        if self.status != self.Status.DRAFT:
            raise ValidationError(
                f"Cannot submit action with status '{self.status}'. Only DRAFT actions can be submitted."
            )
        
        self.status = self.Status.SUBMITTED
        self.submitted_at = timezone.now()
        self.save(update_fields=['status', 'submitted_at', 'updated_at'])
    
    def approve(self, reviewer, comments=''):
        """
        Approve the mitigation action.
        Optionally updates the risk's residual score if assessment provided.
        """
        if self.status != self.Status.SUBMITTED:
            raise ValidationError(
                f"Cannot approve action with status '{self.status}'. Only SUBMITTED actions can be approved."
            )
        
        self.status = self.Status.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_comments = comments
        self.actual_completion = self.actual_completion or timezone.now().date()
        self.save()
        
        # Update risk residual score if assessment provided
        if self.residual_probability and self.residual_impact:
            new_residual_score = self.residual_probability * self.residual_impact
            self.risk.residual_risk_score = new_residual_score
            self.risk.save(update_fields=['residual_risk_score', 'updated_at'])
    
    def reject(self, reviewer, comments):
        """Reject the mitigation action with reason."""
        if self.status != self.Status.SUBMITTED:
            raise ValidationError(
                f"Cannot reject action with status '{self.status}'. Only SUBMITTED actions can be rejected."
            )
        
        if not comments:
            raise ValidationError("Rejection reason is required.")
        
        self.status = self.Status.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_comments = comments
        self.save()
    
    @property
    def can_submit(self):
        """Check if action can be submitted."""
        return self.status == self.Status.DRAFT and self.proof_documents.exists()
    
    @property
    def has_proof(self):
        """Check if action has proof documents."""
        return self.proof_documents.exists()


class MitigationProofDocument(models.Model):
    """
    Proof documents attached to a mitigation action.
    At least ONE document is REQUIRED before action can be submitted.
    
    Documents are stored in EDMS under:
    {Project}/Risk Management/{risk_code}/Mitigations/
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mitigation_action = models.ForeignKey(
        RiskMitigationAction, 
        on_delete=models.CASCADE, 
        related_name='proof_documents'
    )
    document = models.ForeignKey(
        'edms.Document', 
        on_delete=models.CASCADE,
        related_name='mitigation_proofs'
    )
    description = models.TextField(
        blank=True, 
        help_text="Brief description of what this document proves"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"Proof for {self.mitigation_action.risk.risk_code} Action #{self.mitigation_action.action_number}"


class RiskAuditLog(models.Model):
    """
    Immutable audit trail for risk management actions.
    Tracks all changes for compliance and reporting.
    """
    
    class Action(models.TextChoices):
        CREATED = 'CREATED', 'Risk Created'
        UPDATED = 'UPDATED', 'Risk Updated'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'
        DOCUMENT_ADDED = 'DOCUMENT_ADDED', 'Document Added'
        MITIGATION_ADDED = 'MITIGATION_ADDED', 'Mitigation Action Added'
        MITIGATION_SUBMITTED = 'MITIGATION_SUBMITTED', 'Mitigation Submitted'
        MITIGATION_APPROVED = 'MITIGATION_APPROVED', 'Mitigation Approved'
        MITIGATION_REJECTED = 'MITIGATION_REJECTED', 'Mitigation Rejected'
        OWNER_CHANGED = 'OWNER_CHANGED', 'Owner Changed'
        ASSESSMENT_UPDATED = 'ASSESSMENT_UPDATED', 'Risk Assessment Updated'
        CLOSED = 'CLOSED', 'Risk Closed'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    risk = models.ForeignKey(
        Risk, 
        on_delete=models.CASCADE, 
        related_name='audit_logs'
    )
    
    action = models.CharField(max_length=25, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    actor_name = models.CharField(max_length=200, blank=True)
    actor_role = models.CharField(max_length=50, blank=True)
    
    details = models.JSONField(
        default=dict,
        help_text="Additional action details"
    )
    previous_values = models.JSONField(
        default=dict,
        blank=True,
        help_text="Field values before change"
    )
    new_values = models.JSONField(
        default=dict,
        blank=True,
        help_text="Field values after change"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['risk', 'action']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.risk.risk_code} - {self.action} by {self.actor_name}"
    
    def save(self, *args, **kwargs):
        # Freeze actor details
        if self.actor and not self.actor_name:
            self.actor_name = f"{self.actor.first_name} {self.actor.last_name}".strip() or self.actor.username
            self.actor_role = getattr(self.actor, 'role', '')
        
        # Enforce immutability
        if self.pk and RiskAuditLog.objects.filter(pk=self.pk).exists():
            raise Exception("Risk audit logs are immutable and cannot be modified.")
        
        super().save(*args, **kwargs)
