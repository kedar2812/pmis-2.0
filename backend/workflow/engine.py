"""
Workflow Engine Service

State-machine based workflow processor for handling document approvals.
Supports starting, forwarding, reverting, and completing workflows.
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from typing import Optional, List, Dict, Any
import logging

from .models import (
    WorkflowTemplate, WorkflowStep, WorkflowTriggerRule,
    WorkflowInstance, WorkflowAuditLog, DelegationRule,
    WorkflowModule, WorkflowStatus, AuditAction
)

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """
    State-machine based workflow processor.
    
    Handles the complete lifecycle of document approval workflows:
    - Starting a workflow based on trigger rules
    - Forwarding to next step
    - Reverting to previous step
    - Rejecting workflows
    - Completing workflows
    - Calculating TAT (Turn Around Time)
    """
    
    @transaction.atomic
    def start_workflow(
        self,
        entity_type: str,
        entity_id: str,
        entity: Any,
        user,
        module: str = None
    ) -> Optional[WorkflowInstance]:
        """
        Start a new workflow for an entity.
        
        1. Determine module from entity type if not provided
        2. Evaluate trigger rules to find matching template
        3. Create WorkflowInstance
        4. Set current_step to Step 1
        5. Create audit log entry
        
        Args:
            entity_type: Model name (e.g., "RABill")
            entity_id: Primary key of the document
            entity: The actual model instance for rule evaluation
            user: User initiating the workflow
            module: Optional module override
            
        Returns:
            WorkflowInstance or None if no matching template
        """
        # Map entity types to modules
        if not module:
            module = self._get_module_for_entity(entity_type)
        
        if not module:
            logger.warning(f"No module mapping for entity type: {entity_type}")
            return None
        
        # Find matching template via trigger rules
        template = self._find_matching_template(module, entity)
        
        if not template:
            logger.warning(f"No workflow template found for {entity_type} with module {module}")
            return None
        
        # Get first step
        first_step = template.get_first_step()
        if not first_step:
            logger.error(f"Template {template.name} has no steps defined")
            return None
        
        # Check for existing active workflow
        existing = WorkflowInstance.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id,
            status__in=[WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS]
        ).first()
        
        if existing:
            logger.info(f"Active workflow already exists for {entity_type} {entity_id}")
            return existing
        
        # Create workflow instance
        instance = WorkflowInstance.objects.create(
            template=template,
            entity_type=entity_type,
            entity_id=entity_id,
            current_step=first_step,
            status=WorkflowStatus.IN_PROGRESS,
            started_by=user
        )
        
        # Create audit log
        WorkflowAuditLog.objects.create(
            instance=instance,
            step=first_step,
            action=AuditAction.STARTED,
            performed_by=user,
            remarks=f"Workflow started: {template.name}",
            to_step=first_step.sequence
        )
        
        logger.info(f"Started workflow {instance.id} for {entity_type} {entity_id}")
        return instance
    
    @transaction.atomic
    def forward(
        self,
        instance: WorkflowInstance,
        user,
        remarks: str = ""
    ) -> Dict[str, Any]:
        """
        Forward workflow to next step.
        
        1. Validate user can act on current step
        2. Log audit entry with timestamps
        3. Move to next step (or complete if last)
        4. Return result
        """
        if not self._can_user_act(instance, user):
            return {
                'success': False,
                'error': 'You are not authorized to act on this workflow step'
            }
        
        current_step = instance.current_step
        if not current_step:
            return {'success': False, 'error': 'No current step found'}
        
        # Check if remarks required
        if current_step.remarks_required and not remarks.strip():
            return {'success': False, 'error': 'Remarks are required for this step'}
        
        # Close current step audit log
        current_log = WorkflowAuditLog.objects.filter(
            instance=instance,
            step=current_step,
            exited_at__isnull=True
        ).order_by('-entered_at').first()
        
        if current_log:
            current_log.exited_at = timezone.now()
            current_log.save()
        
        # Get next step
        next_step = current_step.get_next_step()
        
        if next_step:
            # Move to next step
            instance.current_step = next_step
            instance.status = WorkflowStatus.IN_PROGRESS
            instance.save()
            
            # Create new audit log
            WorkflowAuditLog.objects.create(
                instance=instance,
                step=next_step,
                action=AuditAction.FORWARD,
                performed_by=user,
                remarks=remarks,
                from_step=current_step.sequence,
                to_step=next_step.sequence
            )
            
            return {
                'success': True,
                'message': f'Forwarded to Step {next_step.sequence}',
                'next_step': next_step,
                'is_complete': False
            }
        else:
            # This was the last step - complete the workflow
            instance.current_step = None
            instance.status = WorkflowStatus.COMPLETED
            instance.completed_at = timezone.now()
            instance.save()
            
            WorkflowAuditLog.objects.create(
                instance=instance,
                step=current_step,
                action=AuditAction.COMPLETE,
                performed_by=user,
                remarks=remarks or "Workflow completed",
                from_step=current_step.sequence
            )
            
            return {
                'success': True,
                'message': 'Workflow completed successfully',
                'is_complete': True
            }
    
    @transaction.atomic
    def revert(
        self,
        instance: WorkflowInstance,
        to_step_sequence: int,
        user,
        remarks: str = ""
    ) -> Dict[str, Any]:
        """
        Revert workflow to a previous step for clarification.
        """
        if not self._can_user_act(instance, user):
            return {
                'success': False,
                'error': 'You are not authorized to act on this workflow step'
            }
        
        current_step = instance.current_step
        if not current_step:
            return {'success': False, 'error': 'No current step found'}
        
        if to_step_sequence >= current_step.sequence:
            return {'success': False, 'error': 'Can only revert to earlier steps'}
        
        # Find target step
        target_step = instance.template.get_step_by_sequence(to_step_sequence)
        if not target_step:
            return {'success': False, 'error': f'Step {to_step_sequence} not found'}
        
        if not current_step.can_revert:
            return {'success': False, 'error': 'Current step does not allow reversion'}
        
        # Close current audit log
        current_log = WorkflowAuditLog.objects.filter(
            instance=instance,
            step=current_step,
            exited_at__isnull=True
        ).order_by('-entered_at').first()
        
        if current_log:
            current_log.exited_at = timezone.now()
            current_log.save()
        
        # Update instance
        instance.current_step = target_step
        instance.status = WorkflowStatus.REVERTED
        instance.save()
        
        # Create revert audit log
        WorkflowAuditLog.objects.create(
            instance=instance,
            step=target_step,
            action=AuditAction.REVERT,
            performed_by=user,
            remarks=remarks or "Reverted for clarification",
            from_step=current_step.sequence,
            to_step=to_step_sequence
        )
        
        return {
            'success': True,
            'message': f'Reverted to Step {to_step_sequence}',
            'target_step': target_step
        }
    
    @transaction.atomic
    def reject(
        self,
        instance: WorkflowInstance,
        user,
        remarks: str = ""
    ) -> Dict[str, Any]:
        """
        Reject the workflow entirely.
        """
        if not self._can_user_act(instance, user):
            return {
                'success': False,
                'error': 'You are not authorized to act on this workflow step'
            }
        
        current_step = instance.current_step
        
        # Close current audit log
        current_log = WorkflowAuditLog.objects.filter(
            instance=instance,
            step=current_step,
            exited_at__isnull=True
        ).order_by('-entered_at').first()
        
        if current_log:
            current_log.exited_at = timezone.now()
            current_log.save()
        
        # Update instance
        instance.status = WorkflowStatus.REJECTED
        instance.completed_at = timezone.now()
        instance.save()
        
        # Create reject audit log
        WorkflowAuditLog.objects.create(
            instance=instance,
            step=current_step,
            action=AuditAction.REJECT,
            performed_by=user,
            remarks=remarks or "Workflow rejected"
        )
        
        return {
            'success': True,
            'message': 'Workflow rejected'
        }
    
    def get_pending_for_user(self, user) -> List[WorkflowInstance]:
        """
        Get all pending workflow instances for a user.
        
        Considers:
        - User's role
        - Active delegations to user
        - Direct assignments
        """
        user_role = getattr(user, 'role', None)
        
        # Find pending instances for user's role
        role_instances = Q()
        if user_role:
            role_instances = Q(
                current_step__role=user_role,
                status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
            )
        
        # Find direct assignments
        direct_assignments = Q(
            assigned_to=user,
            status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
        )
        
        # Find delegated items
        delegated = Q()
        active_delegations = DelegationRule.objects.filter(
            delegate_to=user,
            is_active=True,
            valid_from__lte=timezone.now(),
            valid_to__gte=timezone.now()
        )
        
        for delegation in active_delegations:
            delegator_role = getattr(delegation.delegator, 'role', None)
            if delegator_role:
                if delegation.module:
                    delegated |= Q(
                        current_step__role=delegator_role,
                        template__module=delegation.module,
                        status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
                    )
                else:
                    delegated |= Q(
                        current_step__role=delegator_role,
                        status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
                    )
        
        return WorkflowInstance.objects.filter(
            role_instances | direct_assignments | delegated
        ).select_related('template', 'current_step', 'current_step__role').distinct()
    
    def get_workflow_history(self, instance: WorkflowInstance) -> List[Dict[str, Any]]:
        """
        Get complete audit history for a workflow instance.
        """
        logs = instance.audit_logs.select_related('step', 'performed_by').order_by('entered_at')
        
        history = []
        for log in logs:
            history.append({
                'id': str(log.id),
                'action': log.action,
                'action_display': log.get_action_display(),
                'step': log.step.sequence if log.step else None,
                'step_label': str(log.step) if log.step else None,
                'performed_by': log.performed_by.get_full_name() if log.performed_by else 'System',
                'performed_by_id': str(log.performed_by.id) if log.performed_by else None,
                'remarks': log.remarks,
                'entered_at': log.entered_at.isoformat(),
                'exited_at': log.exited_at.isoformat() if log.exited_at else None,
                'time_spent_hours': log.time_spent_hours,
                'from_step': log.from_step,
                'to_step': log.to_step
            })
        
        return history
    
    def calculate_tat(self, instance: WorkflowInstance) -> Dict[str, Any]:
        """
        Calculate turnaround time statistics for a workflow.
        """
        logs = instance.audit_logs.filter(
            time_spent_hours__isnull=False
        ).order_by('entered_at')
        
        step_times = {}
        total_hours = 0
        
        for log in logs:
            step_key = f"step_{log.step.sequence}" if log.step else "unknown"
            if step_key not in step_times:
                step_times[step_key] = {
                    'step_sequence': log.step.sequence if log.step else None,
                    'step_label': str(log.step) if log.step else 'Unknown',
                    'total_hours': 0,
                    'iterations': 0
                }
            step_times[step_key]['total_hours'] += log.time_spent_hours
            step_times[step_key]['iterations'] += 1
            total_hours += log.time_spent_hours
        
        # Calculate elapsed time from start
        elapsed = None
        if instance.started_at:
            end_time = instance.completed_at or timezone.now()
            elapsed = (end_time - instance.started_at).total_seconds() / 3600
        
        return {
            'total_hours': total_hours,
            'elapsed_hours': elapsed,
            'step_breakdown': list(step_times.values()),
            'average_per_step': total_hours / len(step_times) if step_times else 0,
            'is_complete': instance.is_complete
        }
    
    def _can_user_act(self, instance: WorkflowInstance, user) -> bool:
        """
        Check if user can act on the current workflow step.
        """
        if not instance.current_step:
            return False
        
        # Check direct assignment
        if instance.assigned_to == user:
            return True
        
        # Check role match - compare user role with step role
        user_role = getattr(user, 'role', None)
        step_role = instance.current_step.role
        
        if user_role and step_role and user_role == step_role:
            return True
        
        # Check delegations
        active_delegations = DelegationRule.objects.filter(
            delegate_to=user,
            is_active=True,
            valid_from__lte=timezone.now(),
            valid_to__gte=timezone.now()
        )
        
        for delegation in active_delegations:
            delegator_role = getattr(delegation.delegator, 'role', None)
            if delegator_role and step_role and delegator_role == step_role:
                # Check module filter
                if delegation.module:
                    if instance.template.module == delegation.module:
                        return True
                else:
                    return True
        
        # Check if user is superuser/admin
        if hasattr(user, 'is_superuser') and user.is_superuser:
            return True
        
        return False
    
    def _get_module_for_entity(self, entity_type: str) -> Optional[str]:
        """
        Map entity type to workflow module.
        """
        mapping = {
            'RABill': WorkflowModule.RA_BILL,
            'Tender': WorkflowModule.TENDER,
            'Design': WorkflowModule.DESIGN,
            'Variation': WorkflowModule.VARIATION,
            'VariationOrder': WorkflowModule.VARIATION,
            'Contract': WorkflowModule.CONTRACT,
            'BOQItem': WorkflowModule.BOQ,
            'Risk': WorkflowModule.RISK,
        }
        return mapping.get(entity_type)
    
    def _find_matching_template(self, module: str, entity: Any) -> Optional[WorkflowTemplate]:
        """
        Find the appropriate workflow template using trigger rules.
        
        Rules are evaluated in priority order.
        Falls back to default template if no rules match.
        """
        # Get active trigger rules for this module, ordered by priority
        rules = WorkflowTriggerRule.objects.filter(
            module=module,
            is_active=True
        ).select_related('template').order_by('priority')
        
        # Evaluate each rule
        for rule in rules:
            if rule.template.is_active and rule.evaluate(entity):
                logger.info(f"Matched trigger rule: {rule.name}")
                return rule.template
        
        # Fall back to default template
        default = WorkflowTemplate.objects.filter(
            module=module,
            is_active=True,
            is_default=True
        ).first()
        
        if default:
            logger.info(f"Using default template: {default.name}")
            return default
        
        # Return any active template as last resort
        any_template = WorkflowTemplate.objects.filter(
            module=module,
            is_active=True
        ).first()
        
        return any_template


# Singleton instance
workflow_engine = WorkflowEngine()
