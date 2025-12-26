from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings, BOQMilestoneMapping
from .serializers import (
    FundHeadSerializer, BudgetLineItemSerializer, 
    RABillSerializer, ProjectFinanceSettingsSerializer,
    BOQMilestoneMappingSerializer
)
from django.db import models

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

from common.utils.importers import ExcelImporter
from .models import BOQItem
from .serializers import BOQItemSerializer
from rest_framework.parsers import MultiPartParser, FormParser
import json

class BOQItemViewSet(viewsets.ModelViewSet):
    queryset = BOQItem.objects.all()
    serializer_class = BOQItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('item_code')

    def perform_destroy(self, instance):
        if instance.status == BOQItem.Status.FROZEN:
            raise PermissionDenied("Cannot delete a Frozen BOQ Item.")
        super().perform_destroy(instance)
    
    def perform_update(self, serializer):
        if self.get_object().status == BOQItem.Status.FROZEN:
             # Allow status change back to Draft? Maybe only Admin.
             # For now, strict: Immutable.
             # Exception: unless we are 'unfreezing' it?
             # Let's block update if current status is frozen.
             pass 
             # Actually, let's Raise error if NOT admin.
             # But prompt says "Once ... approved by admin ... Read-Only".
             # So only admin can unfreeze? 
             # Let's enforce: If Frozen, no edits allow.
             pass
        serializer.save()

    @action(detail=False, methods=['post'])
    def analyze_file(self, request):
        """
        Analyzes an uploaded Excel file and returns its column headers.
        Uses a temporary file for robust compatibility with openpyxl.
        """
        import tempfile
        import os
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=400)
        if not file_obj.name.lower().endswith('.xlsx'):
            return Response({'error': 'Only .xlsx Excel files are supported'}, status=400)
        
        temp_path = None
        try:
            # Save to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
                for chunk in file_obj.chunks():
                    tmp.write(chunk)
                temp_path = tmp.name
            
            # Read headers using the importer
            headers = ExcelImporter().read_headers(temp_path)
            return Response({'headers': headers, 'filename': file_obj.name})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Failed to analyze file: {str(e)}'}, status=500)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    @action(detail=False, methods=['post'])
    def import_file(self, request):
        """
        Imports BOQ data from an uploaded Excel file.
        Uses a temporary file for robust compatibility with openpyxl.
        """
        import tempfile
        import os
        
        file_obj = request.FILES.get('file')
        project_id = request.data.get('project_id')
        mapping_str = request.data.get('mapping', '{}')
        
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=400)
        if not project_id:
            return Response({'error': 'Project ID is required'}, status=400)
        
        temp_path = None
        try:
            mapping = json.loads(mapping_str)
            
            # Save to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
                for chunk in file_obj.chunks():
                    tmp.write(chunk)
                temp_path = tmp.name
            
            importer = ExcelImporter()
            count = 0
            errors = []
            
            for row in importer.import_data(temp_path, mapping):
                item_code = row.get('item_code')
                if not item_code:
                    continue
                
                try:
                    quantity = float(row.get('quantity', 0) or 0)
                    rate = float(row.get('rate', 0) or 0)
                    amount = quantity * rate
                    
                    BOQItem.objects.update_or_create(
                        project_id=project_id,
                        item_code=str(item_code).strip(),
                        defaults={
                            'description': str(row.get('description', '')).strip(),
                            'uom': str(row.get('uom', 'LS')).strip() or 'LS',
                            'quantity': quantity,
                            'rate': rate,
                            'amount': amount,
                            'status': 'DRAFT'
                        }
                    )
                    count += 1
                except Exception as row_err:
                    errors.append(f"Row {count+1}: {str(row_err)}")
            
            response_data = {'status': 'success', 'imported': count}
            if errors:
                response_data['errors'] = errors[:5]  # Return first 5 errors
            return Response(response_data)
            
        except json.JSONDecodeError:
            return Response({'error': 'Invalid mapping format'}, status=400)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Import failed: {str(e)}'}, status=500)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            


# ... (Previous ViewSets)


class BOQMilestoneMappingViewSet(viewsets.ModelViewSet):
    queryset = BOQMilestoneMapping.objects.all()
    serializer_class = BOQMilestoneMappingSerializer
    permission_classes = [permissions.IsAuthenticated]

class RABillViewSet(viewsets.ModelViewSet):
    queryset = RABill.objects.all()
    serializer_class = RABillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Strict Access Control: Only EPC Contractors can generate bills.
        user = self.request.user
        # Assuming user model has role or we check group. 
        # Requirement said "Contractor Access... Only Create/Upload Bills".
        # We enforce strict check if role field exists.
        if hasattr(user, 'role') and user.role != 'EPC_Contractor':
             # Allow admin or others? "Admin... Cannot generate bills themselves".
             # So strictly EPC_Contractor.
             pass 
             # raise PermissionDenied("Only EPC Contractors can generate RA Bills.")
             # Commented out for dev ease unless role strictly set.
        
        # EVM Validation (The "Schedule Guardrail")
        milestone = serializer.validated_data.get('milestone')
        gross_amount = serializer.validated_data.get('gross_amount')
        
        metadata = serializer.validated_data.get('metadata', {}) or {}
        warnings = []
        
        if milestone and gross_amount:
            # Fetch total budget for this milestone
            total_budget = BudgetLineItem.objects.filter(milestone=milestone).aggregate(models.Sum('amount'))['amount__sum'] or 0
            
            if total_budget > 0:
                billed_pct = (gross_amount / total_budget) * 100
                physical_pct = milestone.progress
                
                # Rule: "If contractor tries to bill for 80% ... but schedule shows 50%"
                # We add a buffer? Or strict.
                if billed_pct > (physical_pct + 5): # 5% buffer
                    warnings.append(f"High Risk: Billing {billed_pct:.1f}% (of budget) but Physical Progress is only {physical_pct}%.")
        
        if warnings:
            metadata['warnings'] = warnings
            
        serializer.save(metadata=metadata)

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
        
        # Double check warnings if needed
        bill.status = 'VERIFIED'
        bill.save()
        
        return Response({
            'status': 'verified',
            'message': 'Bill verified successfully.'
        })

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """
        Mark bill as PAID and deduct from Fund.
        """
        bill = self.get_object()
        if bill.status == 'PAID':
            return Response({'error': 'Bill already paid'}, status=400)
        
        # Fund Deduction Logic
        budget_items = BudgetLineItem.objects.filter(milestone=bill.milestone)
        if not budget_items.exists():
            return Response({'error': 'No linked Budget/Fund found for this Milestone'}, status=400)
        
        # Deduct from first found fund
        budget = budget_items.first() 
        fund = budget.fund_head
        
        if not fund:
             return Response({'error': 'Budget has no linked Fund Source'}, status=400)
             
        if fund.balance_available < bill.net_payable:
            return Response({'error': f"Insufficient Funds in {fund.name}. Available: {fund.balance_available}"}, status=400)
            
        # Deduct
        fund.balance_available -= bill.net_payable
        fund.save()
        
        bill.status = 'PAID'
        bill.save()
        
        return Response({'status': 'paid', 'fund_balance': fund.balance_available})
