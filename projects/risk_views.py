"""
Risk Management Views

Provides API endpoints for:
- Risk CRUD operations
- Risk document management
- Mitigation action workflow
- Risk statistics for dashboard
"""
from rest_framework import viewsets, views, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Avg, Sum, Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from .risk_models import (
    Risk, RiskDocument, RiskMitigationAction, 
    MitigationProofDocument, RiskAuditLog
)
from .risk_serializers import (
    RiskListSerializer, RiskDetailSerializer, 
    RiskCreateSerializer, RiskUpdateSerializer,
    RiskDocumentSerializer, RiskMitigationActionListSerializer,
    RiskMitigationActionDetailSerializer, RiskMitigationActionCreateSerializer,
    MitigationProofDocumentSerializer, RiskAuditLogSerializer,
    MitigationActionSubmitSerializer, MitigationActionReviewSerializer
)
from .risk_services import RiskFolderService


class RiskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Risk CRUD operations.
    
    Endpoints:
    - GET    /api/projects/risks/           - List all risks (filterable)
    - POST   /api/projects/risks/           - Create new risk
    - GET    /api/projects/risks/{id}/      - Get risk details
    - PUT    /api/projects/risks/{id}/      - Update risk
    - DELETE /api/projects/risks/{id}/      - Soft delete risk
    - GET    /api/projects/risks/stats/     - Get risk statistics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Risk.objects.filter(is_active=True).select_related(
            'project', 'owner', 'created_by', 'work_package', 'schedule_task'
        ).prefetch_related('risk_documents', 'mitigation_actions')
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by owner
        owner = self.request.query_params.get('owner')
        if owner:
            queryset = queryset.filter(owner_id=owner)
        
        # Filter overdue only
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                target_resolution__lt=today
            ).exclude(
                status__in=[Risk.Status.CLOSED, Risk.Status.MITIGATED]
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return RiskListSerializer
        elif self.action == 'create':
            return RiskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RiskUpdateSerializer
        return RiskDetailSerializer
    
    def perform_create(self, serializer):
        risk = serializer.save()
        
        # Create audit log
        RiskAuditLog.objects.create(
            risk=risk,
            action=RiskAuditLog.Action.CREATED,
            actor=self.request.user,
            details={
                'title': risk.title,
                'severity': risk.severity,
                'project': str(risk.project_id)
            }
        )
    
    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
        
        # Create audit log
        RiskAuditLog.objects.create(
            risk=instance,
            action=RiskAuditLog.Action.CLOSED,
            actor=self.request.user,
            details={'reason': 'Deleted by user'}
        )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get aggregated risk statistics for dashboard."""
        queryset = self.get_queryset()
        
        # Aggregate statistics
        stats = {
            'total': queryset.count(),
            'by_severity': {
                'critical': queryset.filter(severity='CRITICAL').count(),
                'high': queryset.filter(severity='HIGH').count(),
                'medium': queryset.filter(severity='MEDIUM').count(),
                'low': queryset.filter(severity='LOW').count(),
            },
            'by_status': {},
            'by_category': {},
            'overdue_count': 0,
            'avg_days_open': 0,
            'total_cost_impact': 0,
            'total_schedule_impact': 0,
            'top_risks': []
        }
        
        # Count by status
        for choice in Risk.Status.choices:
            stats['by_status'][choice[0]] = queryset.filter(status=choice[0]).count()
        
        # Count by category
        for choice in Risk.Category.choices:
            count = queryset.filter(category=choice[0]).count()
            if count > 0:
                stats['by_category'][choice[0]] = count
        
        # Overdue count
        today = timezone.now().date()
        stats['overdue_count'] = queryset.filter(
            target_resolution__lt=today
        ).exclude(
            status__in=[Risk.Status.CLOSED, Risk.Status.MITIGATED]
        ).count()
        
        # Average days open (for non-closed risks)
        open_risks = queryset.exclude(status=Risk.Status.CLOSED)
        if open_risks.exists():
            try:
                total_days = sum(r.days_open for r in open_risks)
                stats['avg_days_open'] = round(total_days / open_risks.count(), 1)
            except Exception as e:
                logger.warning(f"Failed to calculate average days open: {e}")
                stats['avg_days_open'] = 0
        
        # Total impacts
        aggregates = queryset.aggregate(
            total_cost=Coalesce(Sum('cost_impact'), 0),
            total_schedule=Coalesce(Sum('schedule_impact_days'), 0)
        )
        stats['total_cost_impact'] = float(aggregates['total_cost'])
        stats['total_schedule_impact'] = aggregates['total_schedule']
        
        # Top 5 high/critical risks
        top_risks = queryset.filter(
            severity__in=['HIGH', 'CRITICAL']
        ).exclude(
            status=Risk.Status.CLOSED
        ).order_by('-risk_score', '-created_at')[:5]
        stats['top_risks'] = RiskListSerializer(top_risks, many=True).data
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """Get audit log for a specific risk."""
        risk = self.get_object()
        logs = risk.audit_logs.all()
        serializer = RiskAuditLogSerializer(logs, many=True)
        return Response(serializer.data)


class RiskDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Risk Document attachments.
    
    Endpoints:
    - GET    /api/projects/risks/{risk_id}/documents/     - List documents
    - POST   /api/projects/risks/{risk_id}/documents/     - Upload document
    - DELETE /api/projects/risks/{risk_id}/documents/{id}/ - Remove document
    """
    serializer_class = RiskDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        risk_id = self.kwargs.get('risk_pk')
        return RiskDocument.objects.filter(risk_id=risk_id).select_related('document')
    
    def perform_create(self, serializer):
        risk_id = self.kwargs.get('risk_pk')
        risk = Risk.objects.get(id=risk_id)
        
        # Ensure EDMS folder exists
        folder = RiskFolderService.get_or_create_risk_folder(risk, self.request.user)
        
        # Save document
        serializer.save(
            risk=risk,
            uploaded_by=self.request.user
        )
        
        # Create audit log
        RiskAuditLog.objects.create(
            risk=risk,
            action=RiskAuditLog.Action.DOCUMENT_ADDED,
            actor=self.request.user,
            details={
                'document_type': serializer.validated_data.get('document_type'),
                'document_id': str(serializer.validated_data.get('document').id)
            }
        )


class RiskMitigationActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Mitigation Actions with workflow.
    
    Endpoints:
    - GET    /api/projects/risks/{risk_id}/mitigations/              - List actions
    - POST   /api/projects/risks/{risk_id}/mitigations/              - Create action
    - GET    /api/projects/risks/{risk_id}/mitigations/{id}/         - Get details
    - PUT    /api/projects/risks/{risk_id}/mitigations/{id}/         - Update action
    - POST   /api/projects/risks/{risk_id}/mitigations/{id}/submit/  - Submit for review
    - POST   /api/projects/risks/{risk_id}/mitigations/{id}/review/  - Approve/Reject
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        risk_id = self.kwargs.get('risk_pk')
        return RiskMitigationAction.objects.filter(
            risk_id=risk_id
        ).select_related('created_by', 'reviewed_by').prefetch_related('proof_documents')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RiskMitigationActionCreateSerializer
        elif self.action == 'retrieve':
            return RiskMitigationActionDetailSerializer
        return RiskMitigationActionListSerializer
    
    def perform_create(self, serializer):
        risk_id = self.kwargs.get('risk_pk')
        risk = Risk.objects.get(id=risk_id)
        
        action = serializer.save(
            risk=risk,
            created_by=self.request.user
        )
        
        # Update risk status to MITIGATING if not already
        if risk.status == Risk.Status.ASSESSED:
            risk.status = Risk.Status.MITIGATING
            risk.save(update_fields=['status', 'updated_at'])
        
        # Create audit log
        RiskAuditLog.objects.create(
            risk=risk,
            action=RiskAuditLog.Action.MITIGATION_ADDED,
            actor=self.request.user,
            details={
                'action_number': action.action_number,
                'action_type': action.action_type,
                'title': action.title
            }
        )
    
    @action(detail=True, methods=['post'])
    def submit(self, request, risk_pk=None, pk=None):
        """Submit mitigation action for review."""
        action = self.get_object()
        serializer = MitigationActionSubmitSerializer(instance=action, data={})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            action.submit()
            
            # Create audit log
            RiskAuditLog.objects.create(
                risk=action.risk,
                action=RiskAuditLog.Action.MITIGATION_SUBMITTED,
                actor=request.user,
                details={
                    'action_number': action.action_number,
                    'title': action.title
                }
            )
            
            return Response({
                'status': 'success',
                'message': 'Mitigation action submitted for review.',
                'action': RiskMitigationActionDetailSerializer(action).data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def review(self, request, risk_pk=None, pk=None):
        """Approve or reject mitigation action."""
        action_obj = self.get_object()
        serializer = MitigationActionReviewSerializer(
            instance=action_obj, 
            data=request.data
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            review_action = serializer.validated_data['action']
            comments = serializer.validated_data.get('comments', '')
            
            if review_action == 'approve':
                action_obj.approve(request.user, comments)
                audit_action = RiskAuditLog.Action.MITIGATION_APPROVED
                message = 'Mitigation action approved.'
            else:
                action_obj.reject(request.user, comments)
                audit_action = RiskAuditLog.Action.MITIGATION_REJECTED
                message = 'Mitigation action rejected.'
            
            # Create audit log
            RiskAuditLog.objects.create(
                risk=action_obj.risk,
                action=audit_action,
                actor=request.user,
                details={
                    'action_number': action_obj.action_number,
                    'comments': comments
                }
            )
            
            return Response({
                'status': 'success',
                'message': message,
                'action': RiskMitigationActionDetailSerializer(action_obj).data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class MitigationProofDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Mitigation Proof Documents.
    
    Endpoints:
    - GET  /api/projects/mitigations/{mitigation_id}/proofs/  - List proofs
    - POST /api/projects/mitigations/{mitigation_id}/proofs/  - Upload proof
    """
    serializer_class = MitigationProofDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        mitigation_id = self.kwargs.get('mitigation_pk')
        return MitigationProofDocument.objects.filter(
            mitigation_action_id=mitigation_id
        ).select_related('document')
    
    def perform_create(self, serializer):
        mitigation_id = self.kwargs.get('mitigation_pk')
        mitigation = RiskMitigationAction.objects.get(id=mitigation_id)
        
        # Ensure folder exists
        folder = RiskFolderService.get_or_create_mitigation_folder(
            mitigation.risk, 
            self.request.user
        )
        
        serializer.save(
            mitigation_action=mitigation,
            uploaded_by=self.request.user
        )


class ProjectRisksView(views.APIView):
    """
    Get all risks for a specific project.
    
    GET /api/projects/{project_id}/risks/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, project_id):
        risks = Risk.objects.filter(
            project_id=project_id,
            is_active=True
        ).select_related('owner').order_by('-created_at')
        
        serializer = RiskListSerializer(risks, many=True)
        return Response(serializer.data)
