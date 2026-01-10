"""
Project Progress Calculator Service

This is the SINGLE SOURCE OF TRUTH for all project progress calculations.
It implements the following business rules:

1. Physical Progress: Weighted average of task progress
   - Formula: Σ(Task Progress × Task Weight) / Σ(Task Weight)
   
2. Earned Value (EV): Sum of task-level earned values
   - Formula: Σ(Task Progress × Budgeted Cost)
   
3. Financial Progress: EV as percentage of approved budget
   - Formula: (EV / Project Budget) × 100

4. Progress State:
   - CLAIMED: Default (computed but not verified)
   - VERIFIED: Approved by authority
   - FLAGGED: Rule violation detected

5. Schedule Variance (SV):
   - Formula: ((Progress / Expected Progress) - 1) × 100
   
CRITICAL: This service is the ONLY code that should update progress fields.
All updates are atomic and logged for audit trail.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class ProjectProgressCalculator:
    """
    Service class for calculating and updating project progress.
    
    Usage:
        calculator = ProjectProgressCalculator(project_id)
        result = calculator.recalculate()
    
    The recalculate() method:
    1. Fetches all tasks for the project
    2. Resolves weights for unresolved tasks
    3. Calculates computed_progress for each task
    4. Aggregates to project-level physical_progress
    5. Calculates earned_value and financial_progress
    6. Checks for flagging conditions
    7. Updates project atomically
    8. Returns detailed result for logging/debugging
    """
    
    # Configuration constants
    SCHEDULE_VARIANCE_FLAG_THRESHOLD = -20.0  # Flag if >20% behind schedule
    MAX_DAILY_PROGRESS_INCREASE = 25.0  # Anti-gaming: max % increase per day (future use)
    
    def __init__(self, project_id):
        """
        Initialize the calculator with a project ID.
        
        Args:
            project_id: Integer ID of the project to recalculate.
        """
        self.project_id = project_id
        self.project = None
        self.tasks = None
        self.result = {
            'project_id': project_id,
            'success': False,
            'physical_progress': 0.0,
            'financial_progress': 0.0,
            'earned_value': Decimal('0.00'),
            'progress_state': 'CLAIMED',
            'schedule_variance': 0.0,
            'task_count': 0,
            'resolved_weights': 0,
            'flagging_reasons': [],
            'errors': []
        }
    
    def recalculate(self):
        """
        Main entry point. Recalculates all progress values for the project.
        
        Returns:
            dict: Detailed result of the calculation including success status,
                  calculated values, and any errors or flagging reasons.
        """
        try:
            with transaction.atomic():
                # Lock the project row to prevent race conditions
                self._load_project()
                if not self.project:
                    self.result['errors'].append(f'Project {self.project_id} not found')
                    return self.result
                
                # Load and process tasks
                self._load_tasks()
                self._resolve_all_weights()
                self._calculate_all_task_progress()
                
                # Aggregate to project level
                self._calculate_physical_progress()
                self._calculate_earned_value()
                self._calculate_financial_progress()
                self._calculate_schedule_variance()
                
                # Determine progress state (flagging logic)
                self._evaluate_progress_state()
                
                # Persist changes
                self._save_project()
                self._save_tasks()
                
                self.result['success'] = True
                logger.info(
                    f"Progress recalculated for Project {self.project_id}: "
                    f"Physical={self.result['physical_progress']:.2f}%, "
                    f"Financial={self.result['financial_progress']:.2f}%, "
                    f"EV=₹{self.result['earned_value']}"
                )
                
        except Exception as e:
            logger.error(f"Error recalculating progress for Project {self.project_id}: {str(e)}")
            self.result['errors'].append(str(e))
            self.result['success'] = False
        
        return self.result
    
    def _load_project(self):
        """Load project with row-level lock."""
        from projects.models import Project
        try:
            self.project = Project.objects.select_for_update().get(id=self.project_id)
        except Project.DoesNotExist:
            self.project = None
    
    def _load_tasks(self):
        """Load all tasks for the project."""
        from scheduling.models import ScheduleTask
        self.tasks = list(
            ScheduleTask.objects.filter(project_id=self.project_id)
            .select_for_update()
            .order_by('start_date', 'wbs_code')
        )
        self.result['task_count'] = len(self.tasks)
    
    def _resolve_all_weights(self):
        """Resolve weights for all tasks that need it."""
        resolved_count = 0
        for task in self.tasks:
            if task.weight is None or task.weight_source == 'UNRESOLVED':
                weight, source = task.resolve_weight()
                if weight is not None:
                    task.weight = weight
                    task.weight_source = source
                    resolved_count += 1
        self.result['resolved_weights'] = resolved_count
    
    def _calculate_all_task_progress(self):
        """Calculate computed_progress for each task."""
        for task in self.tasks:
            progress = task.calculate_progress()
            task.computed_progress = progress
    
    def _calculate_physical_progress(self):
        """
        Calculate weighted average physical progress.
        Formula: Σ(effective_progress × weight) / Σ(weight)
        """
        total_weighted_progress = Decimal('0')
        total_weight = Decimal('0')
        
        for task in self.tasks:
            weight = task.weight or Decimal('0')
            if weight > 0:
                # Use effective_progress which respects the cap
                effective = Decimal(str(task.effective_progress))
                total_weighted_progress += effective * weight
                total_weight += weight
        
        if total_weight > 0:
            physical_progress = float(total_weighted_progress / total_weight)
        else:
            physical_progress = 0.0
        
        self.result['physical_progress'] = round(min(physical_progress, 100.0), 2)
    
    def _calculate_earned_value(self):
        """
        Calculate Earned Value (EV).
        Formula: Σ(task.earned_value).
        Task EV = (effective_progress / 100) × budgeted_cost
        """
        total_ev = Decimal('0')
        for task in self.tasks:
            total_ev += task.earned_value
        
        self.result['earned_value'] = total_ev
    
    def _calculate_financial_progress(self):
        """
        Calculate Financial Progress.
        Formula: (EV / Project Budget) × 100
        """
        if self.project.budget and self.project.budget > 0:
            financial_progress = (self.result['earned_value'] / self.project.budget) * 100
            self.result['financial_progress'] = round(min(float(financial_progress), 100.0), 2)
        else:
            self.result['financial_progress'] = 0.0
    
    def _calculate_schedule_variance(self):
        """
        Calculate Schedule Variance (SV) percentage.
        
        SV = ((Actual Progress / Expected Progress) - 1) × 100
        
        Expected Progress is calculated based on time elapsed:
        Expected = (Days Elapsed / Total Project Duration) × 100
        """
        today = timezone.now().date()
        
        if not self.project.start_date or not self.project.end_date:
            self.result['schedule_variance'] = 0.0
            return
        
        total_duration = (self.project.end_date - self.project.start_date).days
        if total_duration <= 0:
            self.result['schedule_variance'] = 0.0
            return
        
        days_elapsed = (today - self.project.start_date).days
        days_elapsed = max(0, min(days_elapsed, total_duration))
        
        expected_progress = (days_elapsed / total_duration) * 100
        
        if expected_progress > 0:
            actual = self.result['physical_progress']
            sv = ((actual / expected_progress) - 1) * 100
            self.result['schedule_variance'] = round(sv, 1)
        else:
            self.result['schedule_variance'] = 0.0
    
    def _evaluate_progress_state(self):
        """
        Evaluate conditions for flagging the project.
        
        FLAGGED conditions:
        1. Schedule variance exceeds threshold
        2. Any task has unresolved weight
        3. Physical progress > 100% (shouldn't happen, but safety check)
        4. Financial progress significantly ahead of physical (potential front-loading)
        """
        state = 'CLAIMED'
        reasons = []
        
        # Check schedule variance
        if self.result['schedule_variance'] < self.SCHEDULE_VARIANCE_FLAG_THRESHOLD:
            reasons.append(
                f"Schedule behind by {abs(self.result['schedule_variance']):.1f}%"
            )
        
        # Check for unresolved weights
        unresolved_tasks = [t for t in self.tasks if t.weight is None or t.weight <= 0]
        if unresolved_tasks:
            reasons.append(
                f"{len(unresolved_tasks)} task(s) have unresolved/zero weight"
            )
        
        # Check for progress anomalies
        if self.result['physical_progress'] > 100:
            reasons.append("Physical progress exceeds 100%")
        
        # Check for financial/physical mismatch (potential gaming)
        financial = self.result['financial_progress']
        physical = self.result['physical_progress']
        if physical > 0 and financial > (physical * 1.5):
            reasons.append(
                f"Financial progress ({financial:.1f}%) significantly ahead of physical ({physical:.1f}%)"
            )
        
        if reasons:
            state = 'FLAGGED'
            self.result['flagging_reasons'] = reasons
        
        self.result['progress_state'] = state
    
    def _save_project(self):
        """Save calculated values to the project."""
        self.project.physical_progress = self.result['physical_progress']
        self.project.financial_progress = self.result['financial_progress']
        self.project.earned_value = self.result['earned_value']
        self.project.progress_state = self.result['progress_state']
        self.project.schedule_variance = self.result['schedule_variance']
        
        # Also update legacy progress field for backward compatibility
        self.project.progress = self.result['physical_progress']
        
        self.project.save(update_fields=[
            'physical_progress',
            'financial_progress',
            'earned_value',
            'progress_state',
            'schedule_variance',
            'progress',
            'updated_at'
        ])
    
    def _save_tasks(self):
        """Bulk save task updates (weight and computed_progress)."""
        from scheduling.models import ScheduleTask
        
        # Use bulk_update for efficiency with large datasets
        fields_to_update = ['weight', 'weight_source', 'computed_progress']
        ScheduleTask.objects.bulk_update(
            self.tasks,
            fields_to_update,
            batch_size=100
        )


def recalculate_project_progress(project_id):
    """
    Convenience function to recalculate progress for a project.
    
    This is the function that should be called from signals or other code.
    
    Args:
        project_id: Integer ID of the project.
        
    Returns:
        dict: Result of the calculation.
    """
    calculator = ProjectProgressCalculator(project_id)
    return calculator.recalculate()


def recalculate_all_projects():
    """
    Utility function to recalculate progress for ALL projects.
    
    Use with caution - can be slow for large datasets.
    Intended for data migration or batch correction.
    """
    from projects.models import Project
    
    results = []
    project_ids = list(Project.objects.values_list('id', flat=True))
    
    for project_id in project_ids:
        result = recalculate_project_progress(project_id)
        results.append(result)
        logger.info(f"Recalculated project {project_id}: success={result['success']}")
    
    return results
