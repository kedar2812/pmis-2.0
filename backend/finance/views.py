from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import (
    FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings, 
    BOQMilestoneMapping, ApprovalRequest, Notification, BOQExecution, ProgressCalculationLog
)
from .serializers import (
    FundHeadSerializer, BudgetLineItemSerializer, 
    RABillSerializer, ProjectFinanceSettingsSerializer,
    BOQMilestoneMappingSerializer, ApprovalRequestSerializer, NotificationSerializer,
    BOQExecutionSerializer, BOQExecutionCreateSerializer, ProgressCalculationLogSerializer
)
from django.db import models
from users.models import User

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
            raise PermissionDenied("Cannot update a Frozen BOQ Item.")
        serializer.save()

    @action(detail=False, methods=['post'])
    def request_freeze(self, request):
        """
        Request approval to freeze selected BOQ items.
        Creates an ApprovalRequest and notifies admins.
        """
        try:
            item_ids = request.data.get('item_ids', [])
            project_id = request.data.get('project_id')
            description = request.data.get('description', '')
            
            if not item_ids:
                return Response({'error': 'No items selected'}, status=400)
            if not project_id:
                return Response({'error': 'Project ID is required'}, status=400)
            
            # Validate items exist and are in DRAFT status
            items = BOQItem.objects.filter(id__in=item_ids, project_id=project_id, status='DRAFT')
            found_count = items.count()
            
            if found_count == 0:
                return Response({'error': 'No matching draft items found'}, status=400)
            
            # Create approval request with found items only
            approval_request = ApprovalRequest.objects.create(
                request_type=ApprovalRequest.RequestType.BOQ_FREEZE,
                entity_ids=[str(item.id) for item in items],
                entity_type='BOQItem',
                project_id=project_id,
                requested_by=request.user,
                title=f"BOQ Freeze Request - {found_count} items",
                description=description or f"Request to freeze {found_count} BOQ items as baseline."
            )
            
            # Notify all admin users
            admin_users = User.objects.filter(role__in=['NICDC_HQ', 'SPV_Official', 'PMNC_Team'])
            notifications = []
            for admin in admin_users:
                notifications.append(Notification(
                    user=admin,
                    notification_type=Notification.NotificationType.APPROVAL_REQUEST,
                    title="New BOQ Freeze Request",
                    message=f"{request.user.username} has requested to freeze {found_count} BOQ items. Awaiting your approval.",
                    related_url="/approvals",
                    related_request=approval_request
                ))
            if notifications:
                Notification.objects.bulk_create(notifications)
            
            return Response({
                'status': 'success',
                'message': f'Freeze request submitted for {found_count} items',
                'request_id': str(approval_request.id)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Server error: {str(e)}'}, status=500)

    @action(detail=False, methods=['post'])
    def request_unfreeze(self, request):
        """
        Request approval to unfreeze selected BOQ items.
        """
        try:
            item_ids = request.data.get('item_ids', [])
            project_id = request.data.get('project_id')
            description = request.data.get('description', '')
            
            if not item_ids:
                return Response({'error': 'No items selected'}, status=400)
            if not project_id:
                return Response({'error': 'Project ID is required'}, status=400)
            
            items = BOQItem.objects.filter(id__in=item_ids, project_id=project_id, status='FROZEN')
            found_count = items.count()
            
            if found_count == 0:
                return Response({'error': 'No matching frozen items found'}, status=400)
            
            approval_request = ApprovalRequest.objects.create(
                request_type=ApprovalRequest.RequestType.BOQ_UNFREEZE,
                entity_ids=[str(item.id) for item in items],
                entity_type='BOQItem',
                project_id=project_id,
                requested_by=request.user,
                title=f"BOQ Unfreeze Request - {found_count} items",
                description=description or f"Request to unfreeze {found_count} BOQ items for modification."
            )
            
            admin_users = User.objects.filter(role__in=['NICDC_HQ', 'SPV_Official', 'PMNC_Team'])
            notifications = []
            for admin in admin_users:
                notifications.append(Notification(
                    user=admin,
                    notification_type=Notification.NotificationType.APPROVAL_REQUEST,
                    title="New BOQ Unfreeze Request",
                    message=f"{request.user.username} has requested to unfreeze {found_count} BOQ items.",
                    related_url="/approvals",
                    related_request=approval_request
                ))
            if notifications:
                Notification.objects.bulk_create(notifications)
            
            return Response({
                'status': 'success',
                'message': f'Unfreeze request submitted for {found_count} items',
                'request_id': str(approval_request.id)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Server error: {str(e)}'}, status=500)

    @action(detail=False, methods=['post'])
    def analyze_file(self, request):
        """
        Analyzes an uploaded Excel file and returns its column headers.
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
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
                for chunk in file_obj.chunks():
                    tmp.write(chunk)
                temp_path = tmp.name
            
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
                response_data['errors'] = errors[:5]
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


class BOQMilestoneMappingViewSet(viewsets.ModelViewSet):
    queryset = BOQMilestoneMapping.objects.all()
    serializer_class = BOQMilestoneMappingSerializer
    permission_classes = [permissions.IsAuthenticated]


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        status_param = self.request.query_params.get('status')
        
        # Regular users see their own requests
        # Admins see pending requests for their approval
        if hasattr(user, 'role') and user.role in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            pass  # Admins see all
        else:
            qs = qs.filter(requested_by=user)
            
        if status_param:
            qs = qs.filter(status=status_param)
        
        return qs

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending approval requests for admin users."""
        user = request.user
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response([], status=200)
        
        pending = ApprovalRequest.objects.filter(status='PENDING')
        return Response(ApprovalRequestSerializer(pending, many=True).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve the request and apply the changes."""
        approval = self.get_object()
        user = request.user
        
        # Check admin permission
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response({'error': 'You do not have permission to approve requests'}, status=403)
        
        if approval.status != 'PENDING':
            return Response({'error': 'Request is not pending'}, status=400)
        
        notes = request.data.get('notes', '')
        
        # Apply the changes based on request type
        if approval.request_type == 'BOQ_FREEZE':
            BOQItem.objects.filter(id__in=approval.entity_ids).update(status='FROZEN')
        elif approval.request_type == 'BOQ_UNFREEZE':
            BOQItem.objects.filter(id__in=approval.entity_ids).update(status='DRAFT')
        
        # Update approval record
        approval.status = 'APPROVED'
        approval.reviewed_by = user
        approval.reviewed_at = timezone.now()
        approval.review_notes = notes
        approval.save()
        
        # Notify the requester
        Notification.objects.create(
            user=approval.requested_by,
            notification_type=Notification.NotificationType.APPROVAL_RESULT,
            title=f"Request Approved: {approval.title}",
            message=f"Your {approval.get_request_type_display()} has been approved by {user.username}.",
            related_url="/cost/boq",
            related_request=approval
        )
        
        return Response({'status': 'approved', 'message': 'Request approved successfully'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject the request."""
        approval = self.get_object()
        user = request.user
        
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response({'error': 'You do not have permission to reject requests'}, status=403)
        
        if approval.status != 'PENDING':
            return Response({'error': 'Request is not pending'}, status=400)
        
        notes = request.data.get('notes', 'No reason provided')
        
        approval.status = 'REJECTED'
        approval.reviewed_by = user
        approval.reviewed_at = timezone.now()
        approval.review_notes = notes
        approval.save()
        
        # Notify the requester
        Notification.objects.create(
            user=approval.requested_by,
            notification_type=Notification.NotificationType.APPROVAL_RESULT,
            title=f"Request Rejected: {approval.title}",
            message=f"Your {approval.get_request_type_display()} has been rejected. Reason: {notes}",
            related_url="/cost/boq",
            related_request=approval
        )
        
        return Response({'status': 'rejected', 'message': 'Request rejected'})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked_read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all_marked_read'})


class RABillViewSet(viewsets.ModelViewSet):
    queryset = RABill.objects.all()
    serializer_class = RABillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        
        milestone = serializer.validated_data.get('milestone')
        gross_amount = serializer.validated_data.get('gross_amount')
        
        metadata = serializer.validated_data.get('metadata', {}) or {}
        warnings = []
        
        if milestone and gross_amount:
            total_budget = BudgetLineItem.objects.filter(milestone=milestone).aggregate(models.Sum('amount'))['amount__sum'] or 0
            
            if total_budget > 0:
                billed_pct = (gross_amount / total_budget) * 100
                physical_pct = milestone.progress
                
                if billed_pct > (physical_pct + 5):
                    warnings.append(f"High Risk: Billing {billed_pct:.1f}% (of budget) but Physical Progress is only {physical_pct}%.")
        
        if warnings:
            metadata['warnings'] = warnings
            
        bill = serializer.save(metadata=metadata)
        
        # Auto-generate PDF bill
        try:
            from finance.services import generate_ra_bill_pdf
            pdf_url = generate_ra_bill_pdf(bill)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Generated PDF for bill {bill.bill_no}: {pdf_url}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to generate PDF for bill {bill.bill_no}: {str(e)}")
            # Don't fail the bill creation if PDF generation fails
            pass

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        status_param = self.request.query_params.get('status')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'])
    def calculate_etp(self, request):
        """
        Calculate ETP deductions for a given gross amount.
        
        This endpoint fetches active ETP charges from the masters table
        and calculates all applicable deductions, recoveries, and levies.
        
        Request body:
        {
            "gross_amount": 1000000,
            "gst_percentage": 18,
            "retention_percentage": 5,
            "other_deductions": 0,
            "advances_recovery": 0,
            "works_component": null,
            "material_cost": null,
            "labour_cost": null
        }
        
        Returns: Complete bill summary with all calculated charges.
        """
        try:
            from finance.services import ETPCalculationService
            from decimal import Decimal
            
            gross_amount = request.data.get('gross_amount', 0)
            gst_percentage = request.data.get('gst_percentage', 18)
            retention_percentage = request.data.get('retention_percentage', 0)
            other_deductions = request.data.get('other_deductions', 0)
            advances_recovery = request.data.get('advances_recovery', 0)
            works_component = request.data.get('works_component')
            material_cost = request.data.get('material_cost')
            labour_cost = request.data.get('labour_cost')
            
            if not gross_amount or float(gross_amount) <= 0:
                return Response({'error': 'Valid gross_amount is required'}, status=400)
            
            service = ETPCalculationService()
            
            summary = service.generate_bill_summary(
                gross_amount=Decimal(str(gross_amount)),
                gst_percentage=Decimal(str(gst_percentage)),
                works_component=Decimal(str(works_component)) if works_component else None,
                material_cost=Decimal(str(material_cost)) if material_cost else None,
                labour_cost=Decimal(str(labour_cost)) if labour_cost else None,
                other_deductions=Decimal(str(other_deductions)),
                advances_recovery=Decimal(str(advances_recovery)),
                retention_percentage=Decimal(str(retention_percentage)),
            )
            
            return Response(summary)
            
        except ImportError as e:
            return Response({
                'error': 'ETP calculation service not available',
                'detail': str(e)
            }, status=500)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'error': 'Calculation failed',
                'detail': str(e)
            }, status=500)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        bill = self.get_object()
        bill.status = 'VERIFIED'
        bill.save()
        return Response({'status': 'verified', 'message': 'Bill verified successfully.'})

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        bill = self.get_object()
        if bill.status == 'PAID':
            return Response({'error': 'Bill already paid'}, status=400)
        
        budget_items = BudgetLineItem.objects.filter(milestone=bill.milestone)
        if not budget_items.exists():
            return Response({'error': 'No linked Budget/Fund found for this Milestone'}, status=400)
        
        budget = budget_items.first() 
        fund = budget.fund_head
        
        if not fund:
            return Response({'error': 'Budget has no linked Fund Source'}, status=400)
             
        if fund.balance_available < bill.net_payable:
            return Response({'error': f"Insufficient Funds in {fund.name}. Available: {fund.balance_available}"}, status=400)
            
        fund.balance_available -= bill.net_payable
        fund.save()
        
        bill.status = 'PAID'
        bill.save()
        
        return Response({'status': 'paid', 'fund_balance': fund.balance_available})


class BOQExecutionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BOQ Execution entries.
    
    Provides CRUD operations for tracking executed quantities against BOQ items,
    with verification workflow and automatic progress recalculation.
    """
    queryset = BOQExecution.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BOQExecutionCreateSerializer
        return BOQExecutionSerializer
    
    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'boq_item', 'boq_item__project', 'created_by', 'verified_by', 'ra_bill'
        )
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(boq_item__project_id=project_id)
        
        # Filter by BOQ item
        boq_item_id = self.request.query_params.get('boq_item')
        if boq_item_id:
            qs = qs.filter(boq_item_id=boq_item_id)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        
        return qs.order_by('-execution_date', '-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit execution for verification."""
        execution = self.get_object()
        
        if execution.status != 'DRAFT':
            return Response(
                {'error': 'Only draft executions can be submitted'},
                status=400
            )
        
        execution.status = 'SUBMITTED'
        execution.save()
        
        # Notify admins about pending verification
        admin_users = User.objects.filter(role__in=['NICDC_HQ', 'SPV_Official', 'PMNC_Team'])
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type=Notification.NotificationType.APPROVAL_REQUEST,
                title="BOQ Execution Pending Verification",
                message=f"BOQ execution for {execution.boq_item.item_code} submitted by {request.user.username}",
                related_url="/cost/progress"
            )
        
        return Response({
            'status': 'submitted',
            'message': 'Execution submitted for verification'
        })
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify execution and recalculate project progress."""
        execution = self.get_object()
        user = request.user
        
        # Check admin permission
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response(
                {'error': 'You do not have permission to verify executions'},
                status=403
            )
        
        if execution.status != 'SUBMITTED':
            return Response(
                {'error': 'Only submitted executions can be verified'},
                status=400
            )
        
        # Verify the execution
        execution.status = 'VERIFIED'
        execution.verified_by = user
        execution.verified_at = timezone.now()
        execution.save()
        
        # Recalculate project progress
        from .progress_service import ProgressCalculationService
        project = execution.boq_item.project
        service = ProgressCalculationService(project)
        progress_result = service.calculate_and_update(triggered_by=user)
        
        # Notify the creator
        if execution.created_by:
            Notification.objects.create(
                user=execution.created_by,
                notification_type=Notification.NotificationType.APPROVAL_RESULT,
                title="Execution Verified",
                message=f"Your BOQ execution for {execution.boq_item.item_code} has been verified",
                related_url="/cost/progress"
            )
        
        return Response({
            'status': 'verified',
            'message': 'Execution verified successfully',
            'progress': progress_result
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject execution with reason."""
        execution = self.get_object()
        user = request.user
        
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response(
                {'error': 'You do not have permission to reject executions'},
                status=403
            )
        
        if execution.status != 'SUBMITTED':
            return Response(
                {'error': 'Only submitted executions can be rejected'},
                status=400
            )
        
        reason = request.data.get('reason', 'No reason provided')
        
        execution.status = 'REJECTED'
        execution.remarks = f"REJECTED: {reason}"
        execution.save()
        
        # Notify the creator
        if execution.created_by:
            Notification.objects.create(
                user=execution.created_by,
                notification_type=Notification.NotificationType.APPROVAL_RESULT,
                title="Execution Rejected",
                message=f"Your BOQ execution for {execution.boq_item.item_code} was rejected. Reason: {reason}",
                related_url="/cost/progress"
            )
        
        return Response({
            'status': 'rejected',
            'message': f'Execution rejected: {reason}'
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending verification executions for admins."""
        user = request.user
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response([], status=200)
        
        pending = BOQExecution.objects.filter(status='SUBMITTED').select_related(
            'boq_item', 'boq_item__project', 'created_by'
        ).order_by('-created_at')
        
        return Response(BOQExecutionSerializer(pending, many=True).data)


class ProgressViewSet(viewsets.ViewSet):
    """
    ViewSet for project progress metrics.
    
    Provides endpoints for:
    - Getting current project progress
    - Triggering manual recalculation
    - Getting detailed BOQ breakdown
    - Viewing progress calculation history
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='project/(?P<project_id>[^/.]+)')
    def project_progress(self, request, project_id=None):
        """Get current progress metrics for a project."""
        from projects.models import Project
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'physical_progress': project.physical_progress,
            'financial_progress': project.financial_progress,
            'earned_value': float(project.earned_value),
            'budget': float(project.budget),
            'spent': float(project.spent),
            'schedule_variance': project.schedule_variance,
            'progress_state': project.progress_state,
            'updated_at': project.updated_at.isoformat()
        })
    
    @action(detail=False, methods=['post'], url_path='recalculate/(?P<project_id>[^/.]+)')
    def recalculate(self, request, project_id=None):
        """Manually trigger progress recalculation for a project."""
        from projects.models import Project
        from .progress_service import ProgressCalculationService
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        service = ProgressCalculationService(project)
        result = service.calculate_and_update(triggered_by=request.user)
        
        return Response({
            'status': 'success',
            'message': 'Progress recalculated successfully',
            'result': result
        })
    
    @action(detail=False, methods=['get'], url_path='breakdown/(?P<project_id>[^/.]+)')
    def boq_breakdown(self, request, project_id=None):
        """Get detailed BOQ progress breakdown for a project."""
        from projects.models import Project
        from .progress_service import ProgressCalculationService
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        service = ProgressCalculationService(project)
        breakdown = service.get_boq_progress_breakdown()
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'boq_items': breakdown,
            'summary': {
                'total_items': len(breakdown),
                'completed_items': len([b for b in breakdown if b['progress_percent'] >= 100]),
                'in_progress_items': len([b for b in breakdown if 0 < b['progress_percent'] < 100]),
                'not_started_items': len([b for b in breakdown if b['progress_percent'] == 0])
            }
        })
    
    @action(detail=False, methods=['get'], url_path='schedule-variance/(?P<project_id>[^/.]+)')
    def schedule_variance(self, request, project_id=None):
        """Get schedule variance metrics for a project."""
        from projects.models import Project
        from .progress_service import ProgressCalculationService
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        service = ProgressCalculationService(project)
        variance = service.calculate_schedule_variance()
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            **variance
        })
    
    @action(detail=False, methods=['get'], url_path='history/(?P<project_id>[^/.]+)')
    def calculation_history(self, request, project_id=None):
        """Get progress calculation history/audit log for a project."""
        from projects.models import Project
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        limit = int(request.query_params.get('limit', 20))
        
        logs = ProgressCalculationLog.objects.filter(
            project=project
        ).select_related('triggered_by').order_by('-calculated_at')[:limit]
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'history': ProgressCalculationLogSerializer(logs, many=True).data
        })


class EVMViewSet(viewsets.ViewSet):
    """
    ViewSet for Earned Value Management (EVM) metrics.
    
    Provides endpoints for:
    - Current EVM metrics (CPI, SPI, CV, SV, etc.)
    - S-Curve time-series data
    - Historical snapshots
    - Forcing snapshot creation
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='metrics/(?P<project_id>[^/.]+)')
    def metrics(self, request, project_id=None):
        """Get current EVM metrics for a project."""
        from projects.models import Project
        from .evm_service import EVMCalculationService
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        service = EVMCalculationService(project)
        metrics = service.calculate_all_metrics()
        
        return Response(metrics)
    
    @action(detail=False, methods=['get'], url_path='s-curve/(?P<project_id>[^/.]+)')
    def s_curve(self, request, project_id=None):
        """Get S-Curve time-series data for charting."""
        from projects.models import Project
        from .evm_service import EVMCalculationService
        from datetime import datetime
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        # Parse optional date filters
        start_date = request.query_params.get('start')
        end_date = request.query_params.get('end')
        
        if start_date:
            start_date = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date = datetime.fromisoformat(end_date).date()
        
        service = EVMCalculationService(project)
        data = service.get_s_curve_data(start_date, end_date)
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'data': data,
            'chart_config': {
                'lines': [
                    {'key': 'pv', 'name': 'Planned Value (PV)', 'color': '#3b82f6'},  # Blue
                    {'key': 'ev', 'name': 'Earned Value (EV)', 'color': '#10b981'},   # Green
                    {'key': 'ac', 'name': 'Actual Cost (AC)', 'color': '#ef4444'},    # Red
                ],
                'xKey': 'label',
                'yLabel': 'Amount (₹)',
            }
        })
    
    @action(detail=False, methods=['get'], url_path='history/(?P<project_id>[^/.]+)')
    def history(self, request, project_id=None):
        """Get EVM snapshot history for a project."""
        from projects.models import Project
        from .evm_service import ProjectEVMHistory
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        limit = int(request.query_params.get('limit', 50))
        
        snapshots = ProjectEVMHistory.objects.filter(
            project=project
        ).order_by('-snapshot_date')[:limit]
        
        data = [{
            'date': snap.snapshot_date.isoformat(),
            'bac': float(snap.bac),
            'pv': float(snap.pv),
            'ev': float(snap.ev),
            'ac': float(snap.ac),
            'cpi': snap.cpi,
            'spi': snap.spi,
            'cv': float(snap.cv),
            'sv': float(snap.sv),
            'eac': float(snap.eac),
            'planned_percent': snap.planned_percent,
            'actual_percent': snap.actual_percent,
        } for snap in snapshots]
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'snapshots': data
        })
    
    @action(detail=False, methods=['post'], url_path='snapshot/(?P<project_id>[^/.]+)')
    def create_snapshot(self, request, project_id=None):
        """Force creation of an EVM snapshot for today."""
        from projects.models import Project
        from .evm_service import EVMCalculationService
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        service = EVMCalculationService(project)
        snapshot = service.create_snapshot()
        
        return Response({
            'status': 'success',
            'message': 'EVM snapshot created',
            'snapshot_id': str(snapshot.id),
            'snapshot_date': snapshot.snapshot_date.isoformat()
        })
    
    @action(detail=False, methods=['post'], url_path='snapshot-all')
    def create_all_snapshots(self, request):
        """Create EVM snapshots for all active projects (admin only)."""
        user = request.user
        
        if not hasattr(user, 'role') or user.role not in ['NICDC_HQ', 'SPV_Official', 'PMNC_Team']:
            return Response(
                {'error': 'Admin permission required'},
                status=403
            )
        
        from .evm_service import create_evm_snapshots_for_all_projects
        results = create_evm_snapshots_for_all_projects()
        
        return Response({
            'status': 'success',
            'projects_processed': len(results),
            'successful': len([r for r in results if r['success']]),
            'failed': len([r for r in results if not r['success']]),
            'details': results
        })
