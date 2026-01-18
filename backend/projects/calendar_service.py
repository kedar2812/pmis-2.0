"""
Calendar Event Aggregation Service

Aggregates time-sensitive events from multiple modules into a unified calendar view.
Supports milestones, billing events, compliance deadlines, and workflow items.
"""
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class CalendarEventType:
    """Event type constants with colors."""
    MILESTONE = 'MILESTONE'
    BILLING = 'BILLING'
    RISK = 'RISK'
    COMPLIANCE = 'COMPLIANCE'
    WORKFLOW = 'WORKFLOW'
    MEETING = 'MEETING'
    
    COLORS = {
        MILESTONE: '#3b82f6',      # Blue
        BILLING: '#10b981',        # Green
        RISK: '#ef4444',           # Red
        COMPLIANCE: '#f97316',     # Orange
        WORKFLOW: '#8b5cf6',       # Purple
        MEETING: '#06b6d4',        # Cyan
    }


class CalendarEventAggregator:
    """
    Aggregates events from all modules into unified calendar format.
    """
    
    def get_events(
        self, 
        user,
        start_date,
        end_date,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all calendar events within date range.
        
        Args:
            user: Current user
            start_date: Start of date range
            end_date: End of date range
            filters: Optional filters (event_types, projects, etc.)
            
        Returns:
            List of event dictionaries
        """
        events = []
        filters = filters or {}
        event_types = filters.get('event_types', [])
        project_ids = filters.get('projects', [])
        
        # Collect events from all sources
        if not event_types or CalendarEventType.MILESTONE in event_types:
            events.extend(self._get_milestone_events(start_date, end_date, project_ids))
        
        if not event_types or CalendarEventType.BILLING in event_types:
            events.extend(self._get_billing_events(start_date, end_date, project_ids))
        
        if not event_types or CalendarEventType.RISK in event_types:
            events.extend(self._get_risk_events(start_date, end_date, project_ids))
        
        if not event_types or CalendarEventType.COMPLIANCE in event_types:
            events.extend(self._get_compliance_events(start_date, end_date, project_ids))
        
        if not event_types or CalendarEventType.WORKFLOW in event_types:
            events.extend(self._get_workflow_events(user, start_date, end_date))
        
        # Sort by date
        events.sort(key=lambda x: x['start'])
        
        return events
    
    def _get_milestone_events(
        self, 
        start_date, 
        end_date, 
        project_ids: List = None
    ) -> List[Dict]:
        """Get milestone and schedule task events."""
        events = []
        
        try:
            from scheduling.models import ScheduleTask
            
            queryset = ScheduleTask.objects.filter(
                Q(start_date__range=[start_date, end_date]) |
                Q(end_date__range=[start_date, end_date])
            )
            
            if project_ids:
                queryset = queryset.filter(project_id__in=project_ids)
            
            for task in queryset.select_related('project')[:50]:
                is_overdue = task.end_date and task.end_date < timezone.now().date() and task.status != 'COMPLETED'
                
                events.append({
                    'id': f'milestone-{task.id}',
                    'title': task.name,
                    'start': task.start_date.isoformat() if task.start_date else None,
                    'end': task.end_date.isoformat() if task.end_date else None,
                    'type': CalendarEventType.MILESTONE,
                    'color': '#ef4444' if is_overdue else CalendarEventType.COLORS[CalendarEventType.MILESTONE],
                    'priority': 'high' if task.is_critical else 'medium',
                    'entity_type': 'ScheduleTask',
                    'entity_id': str(task.id),
                    'project_name': task.project.name if task.project else None,
                    'status': task.status,
                    'is_overdue': is_overdue,
                    'link_url': f'/scheduling?task={task.id}',
                    'metadata': {
                        'progress': task.progress,
                        'is_critical': task.is_critical
                    }
                })
        except Exception as e:
            logger.error(f"Error fetching milestone events: {e}")
        
        return events
    
    def _get_billing_events(
        self, 
        start_date, 
        end_date, 
        project_ids: List = None
    ) -> List[Dict]:
        """Get RA Bill and payment events."""
        events = []
        
        try:
            from finance.models import RABill
            
            queryset = RABill.objects.filter(
                Q(submitted_date__range=[start_date, end_date]) |
                Q(certified_date__range=[start_date, end_date])
            )
            
            if project_ids:
                queryset = queryset.filter(project_id__in=project_ids)
            
            for bill in queryset.select_related('project', 'contract')[:50]:
                event_date = bill.certified_date or bill.submitted_date
                if not event_date:
                    continue
                    
                events.append({
                    'id': f'billing-{bill.id}',
                    'title': f'RA Bill #{bill.bill_number or bill.id}',
                    'start': event_date.isoformat(),
                    'end': event_date.isoformat(),
                    'type': CalendarEventType.BILLING,
                    'color': CalendarEventType.COLORS[CalendarEventType.BILLING],
                    'priority': 'medium',
                    'entity_type': 'RABill',
                    'entity_id': str(bill.id),
                    'project_name': bill.project.name if bill.project else None,
                    'status': bill.status,
                    'is_overdue': False,
                    'link_url': f'/cost/ra-billing?bill={bill.id}',
                    'metadata': {
                        'amount': float(bill.net_payable or 0),
                        'contract': str(bill.contract) if bill.contract else None
                    }
                })
        except Exception as e:
            logger.error(f"Error fetching billing events: {e}")
        
        return events
    
    def _get_risk_events(
        self, 
        start_date, 
        end_date, 
        project_ids: List = None
    ) -> List[Dict]:
        """Get risk-related events (high risks, mitigation deadlines)."""
        events = []
        
        try:
            from projects.models import Risk
            
            # High-priority risks with target dates
            queryset = Risk.objects.filter(
                probability__gte=4,  # High probability
                status__in=['IDENTIFIED', 'MITIGATING']
            )
            
            if project_ids:
                queryset = queryset.filter(project_id__in=project_ids)
            
            for risk in queryset.select_related('project')[:30]:
                # Use created_at as event date if no specific deadline
                event_date = getattr(risk, 'target_date', None) or risk.created_at.date()
                
                if not (start_date <= event_date <= end_date):
                    continue
                    
                events.append({
                    'id': f'risk-{risk.id}',
                    'title': f'Risk: {risk.title[:50]}',
                    'start': event_date.isoformat(),
                    'end': event_date.isoformat(),
                    'type': CalendarEventType.RISK,
                    'color': CalendarEventType.COLORS[CalendarEventType.RISK],
                    'priority': 'high',
                    'entity_type': 'Risk',
                    'entity_id': str(risk.id),
                    'project_name': risk.project.name if risk.project else None,
                    'status': risk.status,
                    'is_overdue': False,
                    'link_url': f'/risk-management?risk={risk.id}',
                    'metadata': {
                        'severity': risk.impact * risk.probability if hasattr(risk, 'impact') else None,
                        'category': risk.category if hasattr(risk, 'category') else None
                    }
                })
        except Exception as e:
            logger.error(f"Error fetching risk events: {e}")
        
        return events
    
    def _get_compliance_events(
        self, 
        start_date, 
        end_date, 
        project_ids: List = None
    ) -> List[Dict]:
        """Get compliance events (BG expiry, insurance, etc.)."""
        events = []
        
        try:
            from procurement.models import Contract
            
            # Bank Guarantee expiry dates
            queryset = Contract.objects.filter(
                bg_expiry_date__range=[start_date, end_date]
            )
            
            if project_ids:
                queryset = queryset.filter(project_id__in=project_ids)
            
            for contract in queryset.select_related('project')[:30]:
                days_until = (contract.bg_expiry_date - timezone.now().date()).days
                is_urgent = days_until <= 30
                
                events.append({
                    'id': f'compliance-bg-{contract.id}',
                    'title': f'BG Expiry: {contract.contract_number or contract.title[:30]}',
                    'start': contract.bg_expiry_date.isoformat(),
                    'end': contract.bg_expiry_date.isoformat(),
                    'type': CalendarEventType.COMPLIANCE,
                    'color': '#ef4444' if is_urgent else CalendarEventType.COLORS[CalendarEventType.COMPLIANCE],
                    'priority': 'high' if is_urgent else 'medium',
                    'entity_type': 'Contract',
                    'entity_id': str(contract.id),
                    'project_name': contract.project.name if contract.project else None,
                    'status': 'URGENT' if is_urgent else 'UPCOMING',
                    'is_overdue': days_until < 0,
                    'link_url': f'/e-procurement?contract={contract.id}',
                    'metadata': {
                        'days_until': days_until,
                        'contract_value': float(contract.contract_value or 0)
                    }
                })
        except Exception as e:
            logger.error(f"Error fetching compliance events: {e}")
        
        return events
    
    def _get_workflow_events(
        self, 
        user,
        start_date, 
        end_date
    ) -> List[Dict]:
        """Get workflow deadline events (SLA breaches, pending approvals)."""
        events = []
        
        try:
            from workflow.models import WorkflowInstance, WorkflowStatus
            
            # Pending workflows with approaching SLA
            queryset = WorkflowInstance.objects.filter(
                status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
            ).select_related('template', 'current_step')[:30]
            
            for instance in queryset:
                sla_deadline = instance.get_sla_deadline()
                if not sla_deadline:
                    continue
                    
                deadline_date = sla_deadline.date()
                if not (start_date <= deadline_date <= end_date):
                    continue
                
                is_overdue = instance.is_overdue()
                
                events.append({
                    'id': f'workflow-{instance.id}',
                    'title': f'Approval: {instance.entity_type}',
                    'start': deadline_date.isoformat(),
                    'end': deadline_date.isoformat(),
                    'type': CalendarEventType.WORKFLOW,
                    'color': '#ef4444' if is_overdue else CalendarEventType.COLORS[CalendarEventType.WORKFLOW],
                    'priority': 'high' if is_overdue else 'medium',
                    'entity_type': instance.entity_type,
                    'entity_id': str(instance.entity_id),
                    'project_name': None,
                    'status': 'OVERDUE' if is_overdue else instance.status,
                    'is_overdue': is_overdue,
                    'link_url': '/approvals',
                    'metadata': {
                        'template': instance.template.name,
                        'current_step': str(instance.current_step) if instance.current_step else None,
                        'progress': instance.progress_percent
                    }
                })
        except Exception as e:
            logger.error(f"Error fetching workflow events: {e}")
        
        return events
    
    def get_event_summary(self, user, date) -> Dict[str, int]:
        """Get count of events by type for a specific date."""
        end_date = date
        events = self.get_events(user, date, end_date)
        
        summary = {}
        for event in events:
            event_type = event['type']
            summary[event_type] = summary.get(event_type, 0) + 1
        
        return summary
    
    def get_upcoming_events(self, user, days: int = 7) -> List[Dict]:
        """Get events for the next N days."""
        today = timezone.now().date()
        end_date = today + timedelta(days=days)
        return self.get_events(user, today, end_date)


# Singleton instance
calendar_aggregator = CalendarEventAggregator()
