"""
Risk Management Services

Provides business logic for:
- EDMS folder auto-creation for risks
- Risk score calculations
- Notification triggers
"""
from django.db import transaction


class RiskFolderService:
    """
    Service for managing risk-related EDMS folders.
    
    Folder structure:
    {Project}/
    └── Risk Management/              ← Created on first risk document
        └── {risk_code}/              ← Created per risk
            └── Mitigations/          ← Created on first mitigation proof
    """
    
    @staticmethod
    def get_or_create_risk_management_folder(project, created_by=None):
        """
        Get or create the root "Risk Management" folder for a project.
        This folder holds all risk-related documents.
        
        Args:
            project: Project instance
            created_by: User who triggered the creation
            
        Returns:
            Folder instance
        """
        from edms.models import Folder
        
        folder, created = Folder.objects.get_or_create(
            project=project,
            name="Risk Management",
            parent=None,
            defaults={'created_by': created_by}
        )
        
        if created:
            # Log folder creation
            from edms.models import DocumentAuditLog
            try:
                DocumentAuditLog.objects.create(
                    actor=created_by,
                    actor_role=getattr(created_by, 'role', '') if created_by else '',
                    action=DocumentAuditLog.Action.FOLDER_CREATED,
                    resource_type='Folder',
                    resource_id=folder.id,
                    details={
                        'folder_name': 'Risk Management',
                        'project_id': str(project.id),
                        'auto_created': True,
                        'trigger': 'risk_document_upload'
                    }
                )
            except Exception:
                pass  # Don't fail if audit log fails
        
        return folder
    
    @staticmethod
    def get_or_create_risk_folder(risk, created_by=None):
        """
        Get or create a folder for a specific risk.
        Structure: {Project}/Risk Management/{risk_code}/
        
        Args:
            risk: Risk instance
            created_by: User who triggered the creation
            
        Returns:
            Folder instance
        """
        from edms.models import Folder
        
        # First ensure the Risk Management parent folder exists
        rm_folder = RiskFolderService.get_or_create_risk_management_folder(
            risk.project, 
            created_by
        )
        
        # Create folder for this specific risk
        folder, created = Folder.objects.get_or_create(
            project=risk.project,
            name=risk.risk_code,
            parent=rm_folder,
            defaults={'created_by': created_by}
        )
        
        # Update risk with folder reference if not set
        if risk.edms_folder_id != folder.id:
            risk.edms_folder = folder
            risk.save(update_fields=['edms_folder', 'updated_at'])
        
        return folder
    
    @staticmethod
    def get_or_create_mitigation_folder(risk, created_by=None):
        """
        Get or create a "Mitigations" subfolder within a risk folder.
        Structure: {Project}/Risk Management/{risk_code}/Mitigations/
        
        Args:
            risk: Risk instance
            created_by: User who triggered the creation
            
        Returns:
            Folder instance
        """
        from edms.models import Folder
        
        # First ensure the risk folder exists
        risk_folder = RiskFolderService.get_or_create_risk_folder(risk, created_by)
        
        # Create Mitigations subfolder
        folder, _ = Folder.objects.get_or_create(
            project=risk.project,
            name="Mitigations",
            parent=risk_folder,
            defaults={'created_by': created_by}
        )
        
        return folder


class RiskCalculationService:
    """
    Service for risk calculations and aggregations.
    """
    
    # Risk score thresholds
    SEVERITY_THRESHOLDS = {
        'CRITICAL': (16, 25),
        'HIGH': (10, 15),
        'MEDIUM': (5, 9),
        'LOW': (1, 4)
    }
    
    @staticmethod
    def calculate_severity(risk_score):
        """
        Calculate severity level from risk score.
        
        Args:
            risk_score: Integer 1-25
            
        Returns:
            Severity string: LOW, MEDIUM, HIGH, or CRITICAL
        """
        from .risk_models import Risk
        
        if risk_score >= 16:
            return Risk.Severity.CRITICAL
        elif risk_score >= 10:
            return Risk.Severity.HIGH
        elif risk_score >= 5:
            return Risk.Severity.MEDIUM
        return Risk.Severity.LOW
    
    @staticmethod
    def get_project_risk_summary(project):
        """
        Get risk summary statistics for a project.
        
        Args:
            project: Project instance or project_id
            
        Returns:
            dict with risk counts and metrics
        """
        from .risk_models import Risk
        from django.db.models import Sum, Avg
        from django.utils import timezone
        
        project_id = project if isinstance(project, str) else project.id
        
        risks = Risk.objects.filter(
            project_id=project_id,
            is_active=True
        )
        
        today = timezone.now().date()
        
        summary = {
            'total': risks.count(),
            'by_severity': {
                'critical': risks.filter(severity='CRITICAL').count(),
                'high': risks.filter(severity='HIGH').count(),
                'medium': risks.filter(severity='MEDIUM').count(),
                'low': risks.filter(severity='LOW').count(),
            },
            'by_status': {
                'identified': risks.filter(status='IDENTIFIED').count(),
                'assessed': risks.filter(status='ASSESSED').count(),
                'mitigating': risks.filter(status='MITIGATING').count(),
                'mitigated': risks.filter(status='MITIGATED').count(),
                'closed': risks.filter(status='CLOSED').count(),
                'occurred': risks.filter(status='OCCURRED').count(),
            },
            'overdue': risks.filter(
                target_resolution__lt=today
            ).exclude(
                status__in=['CLOSED', 'MITIGATED']
            ).count(),
            'total_cost_impact': float(
                risks.aggregate(Sum('cost_impact'))['cost_impact__sum'] or 0
            ),
            'total_schedule_impact': risks.aggregate(
                Sum('schedule_impact_days')
            )['schedule_impact_days__sum'] or 0,
        }
        
        return summary
    
    @staticmethod
    def recalculate_residual_score(risk):
        """
        Recalculate residual risk score based on approved mitigations.
        Takes the minimum residual score from all approved mitigation actions.
        
        Args:
            risk: Risk instance
        """
        approved_mitigations = risk.mitigation_actions.filter(
            status='APPROVED',
            residual_probability__isnull=False,
            residual_impact__isnull=False
        ).order_by('-reviewed_at')
        
        if approved_mitigations.exists():
            # Use the most recent approved mitigation's assessment
            latest = approved_mitigations.first()
            risk.residual_risk_score = latest.residual_probability * latest.residual_impact
            risk.save(update_fields=['residual_risk_score', 'updated_at'])


class RiskNotificationService:
    """
    Service for risk-related notifications.
    """
    
    @staticmethod
    def notify_high_risk_created(risk):
        """
        Send notifications when a HIGH or CRITICAL risk is created.
        
        Args:
            risk: Risk instance
        """
        from communications.models import Notification
        
        if risk.severity not in ['HIGH', 'CRITICAL']:
            return
        
        # Get recipients: project manager and risk owner
        recipients = []
        
        if risk.project.manager:
            recipients.append(risk.project.manager)
        
        if risk.owner and risk.owner not in recipients:
            recipients.append(risk.owner)
        
        for recipient in recipients:
            try:
                Notification.objects.create(
                    user=recipient,
                    title=f"⚠️ {risk.severity} Risk Identified",
                    message=f"New {risk.severity.lower()} risk '{risk.title}' identified in project {risk.project.name}",
                    link=f"/projects/{risk.project_id}/risks/{risk.id}",
                    priority='HIGH' if risk.severity == 'CRITICAL' else 'NORMAL'
                )
            except Exception:
                pass  # Don't fail if notification fails
    
    @staticmethod
    def notify_risk_overdue(risk):
        """
        Send notification when a risk becomes overdue.
        
        Args:
            risk: Risk instance
        """
        from communications.models import Notification
        
        if not risk.is_overdue or not risk.owner:
            return
        
        try:
            Notification.objects.create(
                user=risk.owner,
                title="🕒 Risk Resolution Overdue",
                message=f"Risk '{risk.risk_code}: {risk.title}' is past its target resolution date.",
                link=f"/projects/{risk.project_id}/risks/{risk.id}",
                priority='HIGH'
            )
        except Exception:
            pass
    
    @staticmethod
    def notify_mitigation_submitted(mitigation_action):
        """
        Notify risk owner when mitigation action is submitted for review.
        
        Args:
            mitigation_action: RiskMitigationAction instance
        """
        from communications.models import Notification
        
        risk = mitigation_action.risk
        
        if not risk.owner:
            return
        
        try:
            Notification.objects.create(
                user=risk.owner,
                title="📋 Mitigation Action Needs Review",
                message=f"Mitigation action for '{risk.risk_code}' submitted by {mitigation_action.created_by.username}",
                link=f"/projects/{risk.project_id}/risks/{risk.id}",
                priority='NORMAL'
            )
        except Exception:
            pass
