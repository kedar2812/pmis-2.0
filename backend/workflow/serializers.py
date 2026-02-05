"""
Workflow API Serializers
"""
from rest_framework import serializers
from .models import (
    WorkflowTemplate, WorkflowStep, WorkflowTriggerRule,
    WorkflowInstance, WorkflowAuditLog, DelegationRule
)


class WorkflowStepSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='get_role_display', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'sequence', 'role', 'role_name', 'action_type', 
            'action_type_display', 'action_label', 'can_revert', 
            'deadline_days', 'remarks_required', 'is_first_step', 'is_last_step'
        ]


class WorkflowTemplateListSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    step_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'module', 'module_display', 'description',
            'is_active', 'is_default', 'step_count', 'created_by_name',
            'created_at', 'updated_at'
        ]


class WorkflowTemplateDetailSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    steps = WorkflowStepSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'module', 'module_display', 'description',
            'is_active', 'is_default', 'steps', 'created_by_name',
            'created_at', 'updated_at'
        ]


class WorkflowTriggerRuleSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    operator_display = serializers.CharField(source='get_condition_operator_display', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = WorkflowTriggerRule
        fields = [
            'id', 'name', 'module', 'module_display', 'condition_field',
            'condition_operator', 'operator_display', 'condition_value',
            'logic_criteria', 'template', 'template_name', 'priority', 
            'is_active', 'created_at'
        ]


class WorkflowAuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    step_label = serializers.SerializerMethodField()
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkflowAuditLog
        fields = [
            'id', 'action', 'action_display', 'step', 'step_label',
            'performed_by', 'performed_by_name', 'remarks',
            'entered_at', 'exited_at', 'time_spent_hours',
            'from_step', 'to_step'
        ]
    
    def get_step_label(self, obj):
        return str(obj.step) if obj.step else None


class WorkflowInstanceListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    module = serializers.CharField(source='template.module', read_only=True)
    module_display = serializers.CharField(source='template.get_module_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_step_label = serializers.SerializerMethodField()
    current_step_role = serializers.SerializerMethodField()
    started_by_name = serializers.CharField(source='started_by.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    sla_deadline = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'template', 'template_name', 'module', 'module_display',
            'entity_type', 'entity_id', 'current_step', 'current_step_label',
            'current_step_role', 'status', 'status_display', 'progress_percent',
            'is_overdue', 'sla_deadline', 'started_at', 'completed_at',
            'started_by_name'
        ]
    
    def get_current_step_label(self, obj):
        return str(obj.current_step) if obj.current_step else 'Completed'
    
    def get_current_step_role(self, obj):
        if obj.current_step:
            return obj.current_step.get_role_display()
        return None
    
    def get_sla_deadline(self, obj):
        deadline = obj.get_sla_deadline()
        return deadline.isoformat() if deadline else None


class WorkflowInstanceDetailSerializer(WorkflowInstanceListSerializer):
    template = WorkflowTemplateDetailSerializer(read_only=True)
    audit_logs = WorkflowAuditLogSerializer(many=True, read_only=True)
    
    class Meta(WorkflowInstanceListSerializer.Meta):
        fields = WorkflowInstanceListSerializer.Meta.fields + ['template', 'audit_logs']


class DelegationRuleSerializer(serializers.ModelSerializer):
    delegator_name = serializers.CharField(source='delegator.get_full_name', read_only=True)
    delegate_to_name = serializers.CharField(source='delegate_to.get_full_name', read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DelegationRule
        fields = [
            'id', 'delegator', 'delegator_name', 'delegate_to', 'delegate_to_name',
            'valid_from', 'valid_to', 'module', 'module_display',
            'is_active', 'is_currently_active', 'reason', 'created_at'
        ]


class WorkflowActionSerializer(serializers.Serializer):
    """Serializer for workflow actions (forward, revert, reject)."""
    remarks = serializers.CharField(required=False, allow_blank=True)
    to_step = serializers.IntegerField(required=False)  # For revert action


class StartWorkflowSerializer(serializers.Serializer):
    """Serializer for starting a workflow."""
    entity_type = serializers.CharField()
    entity_id = serializers.UUIDField()
    module = serializers.CharField(required=False)


class WorkflowActionsResponseSerializer(serializers.Serializer):
    """
    Response serializer for /actions/ endpoint.
    Provides permission flags for the current user on a specific entity.
    """
    has_workflow = serializers.BooleanField(help_text="Whether this entity has an active workflow")
    can_approve = serializers.BooleanField(help_text="User can forward/approve this step")
    can_revert = serializers.BooleanField(help_text="User can send back to previous step")
    can_reject = serializers.BooleanField(help_text="User can reject the workflow")
    current_step_label = serializers.CharField(allow_null=True, help_text="Label of current step")
    current_step_sequence = serializers.IntegerField(allow_null=True, help_text="Sequence number of current step")
    required_role = serializers.CharField(allow_null=True, help_text="Role required for current step")
    workflow_status = serializers.CharField(allow_null=True, help_text="Current workflow status")
    workflow_id = serializers.UUIDField(allow_null=True, help_text="ID of the workflow instance")
    remarks_required = serializers.BooleanField(help_text="Whether remarks are required for this step")


class PerformActionRequestSerializer(serializers.Serializer):
    """
    Request serializer for /perform-action/ endpoint.
    """
    entity_type = serializers.CharField(help_text="Model name (e.g., 'RABill', 'Tender')")
    entity_id = serializers.UUIDField(help_text="Primary key of the document")
    action = serializers.ChoiceField(
        choices=['FORWARD', 'REVERT', 'REJECT'],
        help_text="Action to perform"
    )
    remarks = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Remarks/comments for the action"
    )
    to_step = serializers.IntegerField(
        required=False,
        help_text="Target step sequence (required for REVERT)"
    )
    
    def validate(self, attrs):
        """Validate that REVERT actions have to_step specified."""
        if attrs.get('action') == 'REVERT' and not attrs.get('to_step'):
            raise serializers.ValidationError({
                'to_step': 'Target step is required for REVERT action'
            })
        return attrs


class EntityHistoryRequestSerializer(serializers.Serializer):
    """Request serializer for /entity-history/ endpoint."""
    entity_type = serializers.CharField(help_text="Model name (e.g., 'RABill', 'Tender')")
    entity_id = serializers.UUIDField(help_text="Primary key of the document")

