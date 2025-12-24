from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings
from .serializers import (
    FundHeadSerializer, BudgetLineItemSerializer, 
    RABillSerializer, ProjectFinanceSettingsSerializer
)

class FundHeadViewSet(viewsets.ModelViewSet):
    queryset = FundHead.objects.all()
    serializer_class = FundHeadSerializer
    permission_classes = [permissions.IsAuthenticated]

class BudgetLineItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetLineItem.objects.all()
    serializer_class = BudgetLineItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

class ProjectFinanceSettingsViewSet(viewsets.ModelViewSet):
    queryset = ProjectFinanceSettings.objects.all()
    serializer_class = ProjectFinanceSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def by_project(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Project ID required'}, status=400)
        settings, _ = ProjectFinanceSettings.objects.get_or_create(project_id=project_id)
        return Response(self.get_serializer(settings).data)

class RABillViewSet(viewsets.ModelViewSet):
    queryset = RABill.objects.all()
    serializer_class = RABillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        status_param = self.request.query_params.get('status')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Mark bill as VERIFIED after checking physical progress.
        """
        bill = self.get_object()
        
        # Soft Warning Check
        warnings = []
        if bill.milestone:
            if bill.milestone.progress < 100 and (bill.net_payable / (bill.gross_amount or 1)) > 0.9:
                warnings.append(f"Warning: Milestone is only {bill.milestone.progress}% complete but >90% payment claimed.")
        
        bill.status = 'VERIFIED'
        bill.save()
        
        return Response({
            'status': 'verified',
            'warnings': warnings,
            'message': 'Bill verified successfully.'
        })
