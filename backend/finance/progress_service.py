"""
Project Progress Calculation Service

Government-Grade Implementation for:
1. BOQ-Weighted Physical Progress - Based on executed vs. sanctioned quantities
2. Financial Progress - Earned Value vs. Budget
3. Schedule Variance - Planned vs. Actual

Key Principles:
- No manual override of computed values
- All calculations are traceable
- Progress = f(verified executions only)
"""
from django.db import transaction
from django.db.models import Sum, F
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class ProgressCalculationService:
    """
    Service class for computing project progress metrics.
    
    Calculation Methodology:
    1. Physical Progress = (Sum of Executed Value) / (Total BOQ Value) * 100
       - Executed Value = Executed Qty * Rate for each BOQ item
       - Only VERIFIED executions are counted
       
    2. Financial Progress = (Earned Value) / (Budget) * 100
       - Earned Value = Total Executed Value (same as numerator in physical)
       
    3. Schedule Variance = ((Actual Progress - Planned Progress) / Planned Progress) * 100
       - Planned Progress is based on scheduled milestones
    """
    
    def __init__(self, project):
        self.project = project
        self.calculation_date = timezone.now()
    
    @transaction.atomic
    def calculate_and_update(self, triggered_by=None):
        """
        Calculate all progress metrics and update the project.
        
        This is the main entry point called:
        - After BOQ execution verification
        - After RA Bill approval
        - Via scheduled daily job
        - On-demand from admin panel
        
        Returns:
            dict: Calculation results with metadata
        """
        from finance.models import BOQItem
        from finance.boq_execution import BOQExecution, ProgressCalculationLog
        
        # Get all frozen BOQ items for this project
        boq_items = BOQItem.objects.filter(
            project=self.project,
            status=BOQItem.Status.FROZEN
        )
        
        # Calculate total sanctioned BOQ value
        total_boq_value = boq_items.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Get all verified executions
        verified_executions = BOQExecution.objects.filter(
            boq_item__project=self.project,
            status=BOQExecution.VerificationStatus.VERIFIED
        )
        
        # Calculate total executed value (EV)
        # Using annotation for efficiency
        executed_value_per_item = verified_executions.values(
            'boq_item'
        ).annotate(
            item_executed_value=Sum(
                F('executed_quantity') * F('boq_item__rate')
            )
        )
        
        total_executed_value = sum(
            item['item_executed_value'] or Decimal('0')
            for item in executed_value_per_item
        )
        
        # Calculate physical progress
        if total_boq_value > 0:
            physical_progress = float(
                (Decimal(total_executed_value) / total_boq_value) * 100
            )
        else:
            physical_progress = 0.0
        
        # Cap at 100%
        physical_progress = min(physical_progress, 100.0)
        
        # Calculate financial progress (EV / Budget)
        budget = self.project.budget or Decimal('0')
        if budget > 0:
            financial_progress = float(
                (Decimal(total_executed_value) / budget) * 100
            )
        else:
            financial_progress = 0.0
        
        financial_progress = min(financial_progress, 100.0)
        
        # Get previous values for delta calculation
        prev_physical = self.project.physical_progress or 0.0
        prev_financial = self.project.financial_progress or 0.0
        
        # Update project
        self.project.physical_progress = round(physical_progress, 2)
        self.project.financial_progress = round(financial_progress, 2)
        self.project.earned_value = total_executed_value
        self.project.progress = round(physical_progress, 2)  # Legacy field sync
        self.project.save(update_fields=[
            'physical_progress',
            'financial_progress',
            'earned_value',
            'progress',
            'updated_at'
        ])
        
        # Create audit log
        log = ProgressCalculationLog.objects.create(
            project=self.project,
            physical_progress=physical_progress,
            financial_progress=financial_progress,
            earned_value=total_executed_value,
            total_boq_value=total_boq_value,
            total_executed_value=total_executed_value,
            boq_items_count=boq_items.count(),
            verified_executions_count=verified_executions.count(),
            physical_progress_delta=physical_progress - prev_physical,
            financial_progress_delta=financial_progress - prev_financial,
            triggered_by=triggered_by
        )
        
        logger.info(
            f"Progress calculated for {self.project.name}: "
            f"Physical={physical_progress:.2f}%, Financial={financial_progress:.2f}%"
        )
        
        return {
            'physical_progress': physical_progress,
            'financial_progress': financial_progress,
            'earned_value': float(total_executed_value),
            'total_boq_value': float(total_boq_value),
            'boq_items_count': boq_items.count(),
            'verified_executions_count': verified_executions.count(),
            'calculation_id': str(log.id),
            'calculated_at': self.calculation_date.isoformat()
        }
    
    def get_boq_progress_breakdown(self):
        """
        Get detailed progress for each BOQ item.
        
        Returns:
            list: BOQ items with their individual progress
        """
        from finance.models import BOQItem
        from finance.boq_execution import BOQExecution
        
        boq_items = BOQItem.objects.filter(
            project=self.project,
            status=BOQItem.Status.FROZEN
        ).select_related('project')
        
        result = []
        for item in boq_items:
            # Get total verified execution for this item
            executed = BOQExecution.objects.filter(
                boq_item=item,
                status=BOQExecution.VerificationStatus.VERIFIED
            ).aggregate(
                total_qty=Sum('executed_quantity')
            )['total_qty'] or Decimal('0')
            
            # Calculate item progress
            if item.quantity > 0:
                item_progress = float((executed / item.quantity) * 100)
            else:
                item_progress = 0.0
            
            executed_value = executed * item.rate
            
            result.append({
                'id': str(item.id),
                'item_code': item.item_code,
                'description': item.description[:100],
                'uom': item.uom,
                'sanctioned_qty': float(item.quantity),
                'executed_qty': float(executed),
                'remaining_qty': float(item.quantity - executed),
                'progress_percent': round(item_progress, 2),
                'rate': float(item.rate),
                'sanctioned_value': float(item.amount),
                'executed_value': float(executed_value),
                'status': 'On Track' if item_progress >= 50 else 'Behind'
            })
        
        return result
    
    def calculate_schedule_variance(self):
        """
        Calculate schedule variance based on milestone completion.
        
        Schedule Variance (SV) = EV - PV
        Schedule Performance Index (SPI) = EV / PV
        
        Returns:
            dict: Schedule variance metrics
        """
        from scheduling.models import ScheduleTask
        
        today = timezone.now().date()
        
        # Get all milestones for this project
        milestones = ScheduleTask.objects.filter(
            project=self.project,
            is_milestone=True
        )
        
        total_milestones = milestones.count()
        if total_milestones == 0:
            return {
                'schedule_variance_percent': 0.0,
                'schedule_performance_index': 1.0,
                'status': 'No milestones defined'
            }
        
        # Milestones that should be complete by now (planned)
        planned_complete = milestones.filter(
            planned_end__lte=today
        ).count()
        
        # Milestones actually complete
        actual_complete = milestones.filter(
            status='Completed'
        ).count()
        
        # Calculate planned value % (what should be done)
        if total_milestones > 0:
            planned_progress = (planned_complete / total_milestones) * 100
            actual_progress = (actual_complete / total_milestones) * 100
        else:
            planned_progress = 0
            actual_progress = 0
        
        # Schedule variance percentage
        if planned_progress > 0:
            sv_percent = ((actual_progress - planned_progress) / planned_progress) * 100
            spi = actual_progress / planned_progress
        else:
            sv_percent = 0.0
            spi = 1.0
        
        # Determine status
        if sv_percent >= 0:
            status = 'Ahead of Schedule' if sv_percent > 5 else 'On Schedule'
        elif sv_percent >= -10:
            status = 'Slightly Behind'
        else:
            status = 'Behind Schedule'
        
        # Update project schedule variance
        self.project.schedule_variance = round(sv_percent, 2)
        self.project.save(update_fields=['schedule_variance', 'updated_at'])
        
        return {
            'planned_progress': round(planned_progress, 2),
            'actual_progress': round(actual_progress, 2),
            'schedule_variance_percent': round(sv_percent, 2),
            'schedule_performance_index': round(spi, 2),
            'total_milestones': total_milestones,
            'planned_complete': planned_complete,
            'actual_complete': actual_complete,
            'status': status
        }


def recalculate_project_progress(project_id, triggered_by=None):
    """
    Utility function to recalculate progress for a specific project.
    
    Usage:
        from finance.progress_service import recalculate_project_progress
        result = recalculate_project_progress(project_id, request.user)
    """
    from projects.models import Project
    
    try:
        project = Project.objects.get(id=project_id)
        service = ProgressCalculationService(project)
        return service.calculate_and_update(triggered_by)
    except Project.DoesNotExist:
        logger.error(f"Project {project_id} not found for progress calculation")
        return None


def recalculate_all_projects(triggered_by=None):
    """
    Batch recalculate progress for all active projects.
    
    Called by scheduled job (e.g., daily at midnight).
    """
    from projects.models import Project
    
    active_projects = Project.objects.filter(
        status__in=['In Progress', 'Planning', 'Under Review']
    )
    
    results = []
    for project in active_projects:
        try:
            service = ProgressCalculationService(project)
            result = service.calculate_and_update(triggered_by)
            results.append({
                'project_id': str(project.id),
                'project_name': project.name,
                'success': True,
                'result': result
            })
        except Exception as e:
            logger.exception(f"Failed to calculate progress for {project.name}")
            results.append({
                'project_id': str(project.id),
                'project_name': project.name,
                'success': False,
                'error': str(e)
            })
    
    return results
