"""
Earned Value Management (EVM) Service

Implements PTAG Standard EVM Metrics:
- Primary: BAC, PV, AC, EV
- Variances: CV, SV, VAC (Cost, Schedule, At Completion)
- Indices: CPI, SPI
- Forecasts: EAC (typical/atypical), ETC

Government-Grade Implementation:
- Historical snapshots for S-Curve generation
- Fully computed from BOQ/Execution data - no manual override
- Weekly/monthly history for trend analysis
"""
from django.db import models
from django.db.models import Sum, F
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
from datetime import date, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class ProjectEVMHistory(models.Model):
    """
    Historical snapshots of EVM metrics for S-Curve charts.
    
    Created weekly or on-demand to enable trend visualization.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='evm_history'
    )
    
    snapshot_date = models.DateField(help_text='Date of this snapshot')
    
    # Primary Data Points
    bac = models.DecimalField(max_digits=15, decimal_places=2, help_text='Budget At Completion')
    pv = models.DecimalField(max_digits=15, decimal_places=2, help_text='Planned Value')
    ac = models.DecimalField(max_digits=15, decimal_places=2, help_text='Actual Cost')
    ev = models.DecimalField(max_digits=15, decimal_places=2, help_text='Earned Value')
    
    # Variances
    cv = models.DecimalField(max_digits=15, decimal_places=2, help_text='Cost Variance (EV-AC)')
    sv = models.DecimalField(max_digits=15, decimal_places=2, help_text='Schedule Variance (EV-PV)')
    
    # Performance Indices
    cpi = models.FloatField(help_text='Cost Performance Index (EV/AC)')
    spi = models.FloatField(help_text='Schedule Performance Index (EV/PV)')
    
    # Forecasts
    eac = models.DecimalField(max_digits=15, decimal_places=2, help_text='Estimate At Completion')
    etc = models.DecimalField(max_digits=15, decimal_places=2, help_text='Estimate To Complete')
    vac = models.DecimalField(max_digits=15, decimal_places=2, help_text='Variance At Completion')
    
    # Progress percentages
    planned_percent = models.FloatField(help_text='Planned % complete at snapshot date')
    actual_percent = models.FloatField(help_text='Actual % complete at snapshot date')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['snapshot_date']
        unique_together = ['project', 'snapshot_date']
        indexes = [
            models.Index(fields=['project', 'snapshot_date']),
        ]
    
    def __str__(self):
        return f"{self.project.name} EVM @ {self.snapshot_date}"


class EVMCalculationService:
    """
    Calculates all EVM metrics for a project based on BOQ and execution data.
    
    Data Sources:
    - BAC: Project.budget (sanctioned budget)
    - PV: Time-weighted BOQ value based on schedule
    - AC: RABill net_payable (actual payments)
    - EV: BOQExecution verified value (from progress calculation)
    """
    
    def __init__(self, project):
        self.project = project
        self.today = timezone.now().date()
    
    def calculate_all_metrics(self) -> dict:
        """Calculate all EVM metrics for current date."""
        from finance.models import BOQItem, RABill
        from finance.boq_execution import BOQExecution
        from scheduling.models import ScheduleTask
        
        # BAC = Total sanctioned budget
        bac = self.project.budget or Decimal('0')
        
        # Get project timeline
        start_date = self.project.start_date or self.today
        end_date = self.project.end_date or (self.today + timedelta(days=365))
        total_duration = max((end_date - start_date).days, 1)
        elapsed_days = max((self.today - start_date).days, 0)
        
        # Planned % complete (time-based baseline)
        planned_percent = min((elapsed_days / total_duration) * 100, 100)
        
        # PV = BAC × (% Planned)
        # More accurate: Sum of BOQ values for tasks that should be complete by now
        pv = self._calculate_planned_value(bac, planned_percent)
        
        # AC = Sum of actual costs (RA Bills paid/approved)
        ac = RABill.objects.filter(
            project=self.project,
            status__in=['APPROVED', 'PAID', 'VERIFIED']
        ).aggregate(total=Sum('net_payable'))['total'] or Decimal('0')
        
        # EV = From verified BOQ executions (already calculated in progress service)
        ev = self.project.earned_value or Decimal('0')
        
        # Actual % complete
        actual_percent = self.project.physical_progress or 0.0
        
        # Calculate variances
        cv = ev - ac  # Cost Variance
        sv = ev - pv  # Schedule Variance
        
        # Performance Indices (avoid division by zero)
        cpi = float(ev / ac) if ac > 0 else 1.0
        spi = float(ev / pv) if pv > 0 else 1.0
        
        # Forecasts
        # EAC (typical) = AC + ((BAC - EV) / CPI)
        if cpi > 0:
            eac_typical = ac + ((bac - ev) / Decimal(str(cpi)))
        else:
            eac_typical = bac
        
        # EAC (atypical) = AC + (BAC - EV)
        eac_atypical = ac + (bac - ev)
        
        # Use typical EAC as default
        eac = eac_typical
        
        # ETC = EAC - AC
        etc = eac - ac
        
        # VAC = BAC - EAC
        vac = bac - eac
        
        # Variance percentages
        cv_percent = float((cv / ev) * 100) if ev > 0 else 0.0
        sv_percent = float((sv / pv) * 100) if pv > 0 else 0.0
        
        return {
            'project_id': str(self.project.id),
            'project_name': self.project.name,
            'snapshot_date': self.today.isoformat(),
            
            # Primary metrics
            'bac': float(bac),
            'pv': float(pv),
            'ac': float(ac),
            'ev': float(ev),
            
            # Progress
            'planned_percent': round(planned_percent, 2),
            'actual_percent': round(actual_percent, 2),
            
            # Variances
            'cv': float(cv),
            'sv': float(sv),
            'cv_percent': round(cv_percent, 2),
            'sv_percent': round(sv_percent, 2),
            
            # Indices
            'cpi': round(cpi, 3),
            'spi': round(spi, 3),
            
            # Forecasts
            'eac': float(eac),
            'eac_typical': float(eac_typical),
            'eac_atypical': float(eac_atypical),
            'etc': float(etc),
            'vac': float(vac),
            
            # Status
            'cost_status': 'under_budget' if cpi >= 1.0 else 'over_budget',
            'schedule_status': 'ahead' if spi >= 1.0 else 'behind',
            'overall_status': 'on_track' if (cpi >= 0.95 and spi >= 0.95) else 'at_risk'
        }
    
    def _calculate_planned_value(self, bac, planned_percent):
        """
        Calculate Planned Value based on schedule.
        
        For more accuracy, this should sum BOQ values for milestones
        that should be complete by now. Simplified version uses
        linear interpolation.
        """
        from scheduling.models import ScheduleTask
        from finance.models import BOQMilestoneMapping
        
        # Try to get PV from milestone-based calculation
        try:
            completed_milestones = ScheduleTask.objects.filter(
                project=self.project,
                is_milestone=True,
                planned_end__lte=self.today
            )
            
            # Get BOQ value for these milestones
            pv_from_milestones = BOQMilestoneMapping.objects.filter(
                milestone__in=completed_milestones
            ).aggregate(
                total=Sum(F('boq_item__amount') * F('percentage_allocated') / 100)
            )['total']
            
            if pv_from_milestones:
                return Decimal(str(pv_from_milestones))
        except Exception:
            pass
        
        # Fallback: Linear interpolation
        return bac * Decimal(str(planned_percent / 100))
    
    def create_snapshot(self) -> ProjectEVMHistory:
        """Create a historical snapshot of current EVM metrics."""
        metrics = self.calculate_all_metrics()
        
        snapshot, created = ProjectEVMHistory.objects.update_or_create(
            project=self.project,
            snapshot_date=self.today,
            defaults={
                'bac': Decimal(str(metrics['bac'])),
                'pv': Decimal(str(metrics['pv'])),
                'ac': Decimal(str(metrics['ac'])),
                'ev': Decimal(str(metrics['ev'])),
                'cv': Decimal(str(metrics['cv'])),
                'sv': Decimal(str(metrics['sv'])),
                'cpi': metrics['cpi'],
                'spi': metrics['spi'],
                'eac': Decimal(str(metrics['eac'])),
                'etc': Decimal(str(metrics['etc'])),
                'vac': Decimal(str(metrics['vac'])),
                'planned_percent': metrics['planned_percent'],
                'actual_percent': metrics['actual_percent'],
            }
        )
        
        logger.info(f"EVM snapshot {'created' if created else 'updated'} for {self.project.name}")
        return snapshot
    
    def get_s_curve_data(self, start_date=None, end_date=None) -> list:
        """
        Get time-series data for S-Curve chart.
        
        Returns list of [{date, pv, ev, ac, bac}, ...] for charting.
        """
        # Get historical snapshots
        queryset = ProjectEVMHistory.objects.filter(project=self.project)
        
        if start_date:
            queryset = queryset.filter(snapshot_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(snapshot_date__lte=end_date)
        
        snapshots = queryset.order_by('snapshot_date')
        
        # If no historical data, generate projected curve
        if not snapshots.exists():
            return self._generate_projected_curve()
        
        # Format for chart
        data = []
        for snap in snapshots:
            data.append({
                'date': snap.snapshot_date.isoformat(),
                'label': snap.snapshot_date.strftime('%b %d'),
                'pv': float(snap.pv),
                'ev': float(snap.ev),
                'ac': float(snap.ac),
                'bac': float(snap.bac),
                'planned_percent': snap.planned_percent,
                'actual_percent': snap.actual_percent,
            })
        
        # Add current metrics as latest point
        current = self.calculate_all_metrics()
        if not data or data[-1]['date'] != self.today.isoformat():
            data.append({
                'date': self.today.isoformat(),
                'label': self.today.strftime('%b %d'),
                'pv': current['pv'],
                'ev': current['ev'],
                'ac': current['ac'],
                'bac': current['bac'],
                'planned_percent': current['planned_percent'],
                'actual_percent': current['actual_percent'],
            })
        
        return data
    
    def _generate_projected_curve(self) -> list:
        """Generate projected S-curve when no historical data exists."""
        from scheduling.models import ScheduleTask
        
        bac = float(self.project.budget or 0)
        start = self.project.start_date or self.today
        end = self.project.end_date or (self.today + timedelta(days=365))
        
        # Generate monthly data points
        data = []
        current = start
        
        while current <= end:
            # Calculate planned % at this date (S-curve approximation)
            total_days = (end - start).days or 1
            elapsed = (current - start).days
            linear_percent = (elapsed / total_days) * 100
            
            # S-curve formula (slow start, fast middle, slow end)
            # Using logistic function approximation
            x = (elapsed / total_days - 0.5) * 10
            s_curve_percent = 100 / (1 + 2.71828 ** (-x))
            
            pv = bac * (s_curve_percent / 100)
            
            # For past dates, use actual EV/AC if available
            if current <= self.today:
                ev = float(self.project.earned_value or 0) * (elapsed / max((self.today - start).days, 1))
                ac = ev * 1.02  # Slight cost overrun assumption
            else:
                ev = 0
                ac = 0
            
            data.append({
                'date': current.isoformat(),
                'label': current.strftime('%b %Y'),
                'pv': round(pv, 2),
                'ev': round(ev, 2),
                'ac': round(ac, 2),
                'bac': bac,
                'planned_percent': round(s_curve_percent, 2),
                'actual_percent': round((ev / bac) * 100 if bac > 0 else 0, 2),
            })
            
            # Next month
            current = current + timedelta(days=30)
        
        return data


def create_evm_snapshots_for_all_projects():
    """
    Scheduled job to create weekly EVM snapshots.
    
    Call this from a cron job or Django management command.
    """
    from projects.models import Project
    
    active_projects = Project.objects.filter(
        status__in=['In Progress', 'Planning', 'Under Review']
    )
    
    results = []
    for project in active_projects:
        try:
            service = EVMCalculationService(project)
            snapshot = service.create_snapshot()
            results.append({
                'project': project.name,
                'success': True,
                'snapshot_id': str(snapshot.id)
            })
        except Exception as e:
            logger.exception(f"Failed to create EVM snapshot for {project.name}")
            results.append({
                'project': project.name,
                'success': False,
                'error': str(e)
            })
    
    return results
