"""
Dynamic Workflow Engine Models

State-machine based approval workflow system for government PMIS.
Supports RA Bills, Tenders, Designs, and Variations with configurable
multi-step approval chains.

Schema:
- WorkflowTemplate: Defines a reusable workflow (e.g., "High Value Bill Approval")
- WorkflowStep: Individual steps in a template with role assignments
- WorkflowTriggerRule: Conditions that determine which template to use
- WorkflowInstance: Active workflow for a specific document
- WorkflowAuditLog: Complete audit trail with timestamps
- DelegationRule: Temporary delegation of approval authority
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator


class WorkflowModule(models.TextChoices):
    """Modules that support workflows."""
    RA_BILL = 'RA_BILL', 'RA Bill'
    TENDER = 'TENDER', 'Tender'
    DESIGN = 'DESIGN', 'Design Document'
    VARIATION = 'VARIATION', 'Variation Order'
    CONTRACT = 'CONTRACT', 'Contract'
    BOQ = 'BOQ', 'BOQ Item'
    RISK = 'RISK', 'Risk'


class ActionType(models.TextChoices):
    """Types of actions at each workflow step."""
    VERIFY = 'VERIFY', 'Verify & Check'
    RECOMMEND = 'RECOMMEND', 'Recommend'
    APPROVE = 'APPROVE', 'Approve'
    SANCTION = 'SANCTION', 'Sanction'
    REVIEW = 'REVIEW', 'Review'


class WorkflowStatus(models.TextChoices):
    """Status of a workflow instance."""
    PENDING = 'PENDING', 'Pending'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    REJECTED = 'REJECTED', 'Rejected'
    REVERTED = 'REVERTED', 'Reverted for Clarification'
    CANCELLED = 'CANCELLED', 'Cancelled'


class AuditAction(models.TextChoices):
    """Actions recorded in audit log."""
    STARTED = 'STARTED', 'Workflow Started'
    FORWARD = 'FORWARD', 'Forwarded to Next Step'
    REVERT = 'REVERT', 'Reverted to Previous Step'
    REJECT = 'REJECT', 'Rejected'
    COMPLETE = 'COMPLETE', 'Workflow Completed'
    DELEGATE = 'DELEGATE', 'Delegated'
    ESCALATE = 'ESCALATE', 'Escalated'


class ConditionOperator(models.TextChoices):
    """Operators for trigger rule conditions."""
    GT = 'GT', 'Greater Than'
    GTE = 'GTE', 'Greater Than or Equal'
    LT = 'LT', 'Less Than'
    LTE = 'LTE', 'Less Than or Equal'
    EQ = 'EQ', 'Equals'
    NEQ = 'NEQ', 'Not Equals'
    IN = 'IN', 'In List'
    NOT_IN = 'NOT_IN', 'Not In List'
    CONTAINS = 'CONTAINS', 'Contains'


class WorkflowTemplate(models.Model):
    """
    Defines a reusable workflow template.
    
    Example: "High Value Bill Approval" for bills > 50 Lakhs
    with steps: AE Verify → EE Recommend → SE Approve → CE Sanction
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    module = models.CharField(max_length=20, choices=WorkflowModule.choices)
    description = models.TextField(blank=True)
    
    # Template settings
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text='Use as fallback if no trigger rules match')
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflow_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['module', 'name']
        verbose_name = 'Workflow Template'
        verbose_name_plural = 'Workflow Templates'
    
    def __str__(self):
        return f"{self.name} ({self.get_module_display()})"
    
    @property
    def step_count(self):
        return self.steps.count()
    
    def get_first_step(self):
        return self.steps.order_by('sequence').first()
    
    def get_step_by_sequence(self, sequence):
        return self.steps.filter(sequence=sequence).first()


class WorkflowStep(models.Model):
    """
    Individual step in a workflow template.
    
    Each step is assigned to a role and has an action type.
    Steps are executed in sequence order.
    """
    # Role choices - matches User.Roles from users app
    class StepRole(models.TextChoices):
        SPV_OFFICIAL = 'SPV_Official', 'SPV Official'
        PMNC_TEAM = 'PMNC_Team', 'PMNC Team'
        EPC_CONTRACTOR = 'EPC_Contractor', 'EPC Contractor'
        CONSULTANT_DESIGN = 'Consultant_Design', 'Design Consultant'
        GOVT_DEPARTMENT = 'Govt_Department', 'Government Department'
        NICDC_HQ = 'NICDC_HQ', 'NICDC HQ'
        # Common government hierarchy
        AE = 'AE', 'Assistant Engineer'
        EE = 'EE', 'Executive Engineer'
        SE = 'SE', 'Superintending Engineer'
        CE = 'CE', 'Chief Engineer'
        HOD = 'HOD', 'Head of Department'
        DGM = 'DGM', 'Deputy General Manager'
        GM = 'GM', 'General Manager'
        MD = 'MD', 'Managing Director'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    sequence = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Step order (1, 2, 3...)'
    )
    
    # Who handles this step
    role = models.CharField(
        max_length=50,
        choices=StepRole.choices,
        help_text='Role responsible for this step (e.g., AE, EE, SE, CE)'
    )
    
    # What action is performed
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    action_label = models.CharField(
        max_length=100,
        blank=True,
        help_text='Custom label like "Measure & Verify" or "Technical Sanction"'
    )
    
    # Step configuration
    can_revert = models.BooleanField(
        default=True,
        help_text='Allow reverting to previous step for clarification'
    )
    deadline_days = models.PositiveIntegerField(
        default=3,
        help_text='SLA in working days'
    )
    
    # Optional: require remarks
    remarks_required = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['template', 'sequence']
        unique_together = ['template', 'sequence']
        verbose_name = 'Workflow Step'
        verbose_name_plural = 'Workflow Steps'
    
    def __str__(self):
        label = self.action_label or self.get_action_type_display()
        return f"Step {self.sequence}: {label} ({self.get_role_display()})"
    
    @property
    def is_first_step(self):
        return self.sequence == 1
    
    @property
    def is_last_step(self):
        return not self.template.steps.filter(sequence__gt=self.sequence).exists()
    
    def get_next_step(self):
        return self.template.steps.filter(sequence__gt=self.sequence).order_by('sequence').first()
    
    def get_previous_step(self):
        return self.template.steps.filter(sequence__lt=self.sequence).order_by('-sequence').first()


class WorkflowTriggerRule(models.Model):
    """
    Conditions that determine which workflow template to use.
    
    Example: If RA Bill amount > 50 Lakhs, use "High Value Bill Approval" template.
    Rules are evaluated in priority order (lower = first).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    module = models.CharField(max_length=20, choices=WorkflowModule.choices)
    
    # Condition definition
    condition_field = models.CharField(
        max_length=100,
        help_text='Field to evaluate (e.g., "amount", "type", "project.category")'
    )
    condition_operator = models.CharField(max_length=20, choices=ConditionOperator.choices)
    condition_value = models.CharField(
        max_length=500,
        help_text='Value to compare against (use comma-separated for IN/NOT_IN)'
    )
    
    # Complex logic support (JSONField for advanced conditions)
    logic_criteria = models.JSONField(
        null=True,
        blank=True,
        help_text='Advanced JSON logic for complex conditions'
    )
    
    # Template to use if condition matches
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='trigger_rules'
    )
    
    # Evaluation order
    priority = models.PositiveIntegerField(
        default=100,
        help_text='Lower priority = evaluated first'
    )
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['module', 'priority']
        verbose_name = 'Workflow Trigger Rule'
        verbose_name_plural = 'Workflow Trigger Rules'
    
    def __str__(self):
        return f"{self.name}: {self.condition_field} {self.condition_operator} {self.condition_value}"
    
    def evaluate(self, entity) -> bool:
        """
        Evaluate if this rule matches the given entity.
        """
        try:
            # Navigate nested fields (e.g., "project.category")
            value = self._get_field_value(entity, self.condition_field)
            condition_val = self.condition_value
            
            if self.condition_operator == 'GT':
                return float(value) > float(condition_val)
            elif self.condition_operator == 'GTE':
                return float(value) >= float(condition_val)
            elif self.condition_operator == 'LT':
                return float(value) < float(condition_val)
            elif self.condition_operator == 'LTE':
                return float(value) <= float(condition_val)
            elif self.condition_operator == 'EQ':
                return str(value) == str(condition_val)
            elif self.condition_operator == 'NEQ':
                return str(value) != str(condition_val)
            elif self.condition_operator == 'IN':
                values = [v.strip() for v in condition_val.split(',')]
                return str(value) in values
            elif self.condition_operator == 'NOT_IN':
                values = [v.strip() for v in condition_val.split(',')]
                return str(value) not in values
            elif self.condition_operator == 'CONTAINS':
                return str(condition_val).lower() in str(value).lower()
            
            return False
        except (AttributeError, ValueError, TypeError):
            return False
    
    def _get_field_value(self, entity, field_path: str):
        """Get nested field value from entity."""
        parts = field_path.split('.')
        value = entity
        for part in parts:
            if hasattr(value, part):
                value = getattr(value, part)
            elif isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value


class WorkflowInstance(models.Model):
    """
    Active workflow for a specific document.
    
    Tracks which document is going through which workflow,
    what the current step is, and the overall status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.PROTECT,
        related_name='instances'
    )
    
    # What document this workflow is for
    entity_type = models.CharField(
        max_length=50,
        help_text='Model name (e.g., "RABill", "Tender")'
    )
    entity_id = models.UUIDField(help_text='Primary key of the document')
    
    # Current state
    current_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        related_name='current_instances'
    )
    status = models.CharField(
        max_length=20,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.PENDING
    )
    
    # Assigned user (if specific assignment rather than role-based)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_workflows'
    )
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Initiator
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workflow_initiated'
    )
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Workflow Instance'
        verbose_name_plural = 'Workflow Instances'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['status']),
            models.Index(fields=['current_step']),
        ]
    
    def __str__(self):
        return f"{self.entity_type} #{str(self.entity_id)[:8]} - {self.template.name}"
    
    @property
    def is_complete(self):
        return self.status == WorkflowStatus.COMPLETED
    
    @property
    def is_pending(self):
        return self.status in [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS]
    
    @property
    def current_step_number(self):
        return self.current_step.sequence if self.current_step else 0
    
    @property
    def total_steps(self):
        return self.template.step_count
    
    @property
    def progress_percent(self):
        if self.is_complete:
            return 100
        if self.total_steps == 0:
            return 0
        return int((self.current_step_number / self.total_steps) * 100)
    
    def get_sla_deadline(self):
        """Calculate deadline based on current step SLA."""
        if not self.current_step:
            return None
        from datetime import timedelta
        last_log = self.audit_logs.filter(step=self.current_step).order_by('-entered_at').first()
        if last_log:
            return last_log.entered_at + timedelta(days=self.current_step.deadline_days)
        return None
    
    def is_overdue(self):
        """Check if current step has breached SLA."""
        deadline = self.get_sla_deadline()
        if deadline:
            return timezone.now() > deadline
        return False


class WorkflowAuditLog(models.Model):
    """
    Complete audit trail for workflow actions.
    
    Records every action taken on a workflow instance,
    including who did it, when, and how long it took.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    
    # Action details
    action = models.CharField(max_length=20, choices=AuditAction.choices)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workflow_actions'
    )
    remarks = models.TextField(blank=True)
    
    # Timing for TAT calculation
    entered_at = models.DateTimeField(default=timezone.now)
    exited_at = models.DateTimeField(null=True, blank=True)
    time_spent_hours = models.FloatField(null=True, blank=True)
    
    # Additional context
    from_step = models.PositiveIntegerField(null=True, blank=True)
    to_step = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-entered_at']
        verbose_name = 'Workflow Audit Log'
        verbose_name_plural = 'Workflow Audit Logs'
    
    def __str__(self):
        return f"{self.get_action_display()} by {self.performed_by} on {self.entered_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate time spent if exited_at is set
        if self.exited_at and self.entered_at:
            delta = self.exited_at - self.entered_at
            self.time_spent_hours = delta.total_seconds() / 3600
        super().save(*args, **kwargs)


class DelegationRule(models.Model):
    """
    Temporary delegation of approval authority.
    
    Allows a user to delegate their workflow responsibilities
    to another user for a specific time period (e.g., leave).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who is delegating and to whom
    delegator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='delegations_given'
    )
    delegate_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='delegations_received'
    )
    
    # Validity period
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    
    # Optional: limit to specific module
    module = models.CharField(
        max_length=20,
        choices=WorkflowModule.choices,
        null=True,
        blank=True,
        help_text='Leave empty to delegate all modules'
    )
    
    is_active = models.BooleanField(default=True)
    reason = models.CharField(max_length=500, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-valid_from']
        verbose_name = 'Delegation Rule'
        verbose_name_plural = 'Delegation Rules'
    
    def __str__(self):
        return f"{self.delegator} → {self.delegate_to} ({self.valid_from.date()} to {self.valid_to.date()})"
    
    @property
    def is_currently_active(self):
        now = timezone.now()
        return self.is_active and self.valid_from <= now <= self.valid_to
