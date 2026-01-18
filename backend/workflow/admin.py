"""
Workflow Admin Configuration
"""
from django.contrib import admin
from .models import (
    WorkflowTemplate, WorkflowStep, WorkflowTriggerRule,
    WorkflowInstance, WorkflowAuditLog, DelegationRule
)


class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    extra = 1
    ordering = ['sequence']


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'is_active', 'is_default', 'step_count', 'created_at']
    list_filter = ['module', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    inlines = [WorkflowStepInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    list_display = ['template', 'sequence', 'role', 'action_type', 'deadline_days', 'can_revert']
    list_filter = ['template', 'action_type', 'role']
    ordering = ['template', 'sequence']


@admin.register(WorkflowTriggerRule)
class WorkflowTriggerRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'condition_field', 'condition_operator', 'condition_value', 'template', 'priority', 'is_active']
    list_filter = ['module', 'is_active', 'condition_operator']
    search_fields = ['name', 'condition_field']
    ordering = ['module', 'priority']


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'template', 'current_step', 'status', 'started_at', 'is_overdue']
    list_filter = ['status', 'entity_type', 'template']
    search_fields = ['entity_id']
    readonly_fields = ['started_at', 'completed_at']
    
    def is_overdue(self, obj):
        return obj.is_overdue()
    is_overdue.boolean = True


@admin.register(WorkflowAuditLog)
class WorkflowAuditLogAdmin(admin.ModelAdmin):
    list_display = ['instance', 'step', 'action', 'performed_by', 'entered_at', 'time_spent_hours']
    list_filter = ['action', 'entered_at']
    search_fields = ['instance__entity_id', 'remarks']
    readonly_fields = ['instance', 'step', 'action', 'performed_by', 'entered_at', 'exited_at', 'time_spent_hours']


@admin.register(DelegationRule)
class DelegationRuleAdmin(admin.ModelAdmin):
    list_display = ['delegator', 'delegate_to', 'module', 'valid_from', 'valid_to', 'is_active', 'is_currently_active']
    list_filter = ['is_active', 'module']
    search_fields = ['delegator__username', 'delegate_to__username', 'reason']
