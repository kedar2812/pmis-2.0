from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Sum

from .models import Tender, Bid, Contract, Variation
from .serializers import (
    TenderSerializer, TenderListSerializer,
    BidSerializer,
    ContractSerializer, ContractListSerializer,
    VariationSerializer
)


class TenderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tender CRUD with workflow actions.
    """
    queryset = Tender.objects.select_related('project', 'work_package', 'schedule_task', 'created_by').all()
    serializer_class = TenderSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return TenderListSerializer
        return TenderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a draft tender."""
        tender = self.get_object()
        if tender.status != Tender.TenderStatus.DRAFT:
            return Response({'error': 'Only draft tenders can be published'}, status=status.HTTP_400_BAD_REQUEST)
        
        tender.status = Tender.TenderStatus.PUBLISHED
        tender.publish_date = timezone.now().date()
        tender.save()
        return Response(TenderSerializer(tender).data)

    @action(detail=True, methods=['post'])
    def sync_to_nicdc(self, request, pk=None):
        """
        Publish tender to NICDC Procurement Portal for external visibility.
        This enables bidders to view and submit bids through the central portal.
        """
        from .nicdc_integration import nicdc_service
        
        tender = self.get_object()
        
        if not nicdc_service.is_configured():
            return Response({
                'error': 'NICDC Portal integration is not configured',
                'hint': 'Set NICDC_PORTAL_API_URL and NICDC_PORTAL_API_KEY in environment'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        if tender.nicdc_portal_ref:
            return Response({
                'message': 'Tender already synced to NICDC Portal',
                'nicdc_ref': tender.nicdc_portal_ref
            })
        
        nicdc_ref = nicdc_service.publish_tender(tender)
        
        if nicdc_ref:
            return Response({
                'message': 'Tender published to NICDC Portal',
                'nicdc_ref': nicdc_ref
            })
        else:
            return Response({
                'error': 'Failed to publish tender to NICDC Portal'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def open_bids(self, request, pk=None):
        """Open bids for evaluation."""
        tender = self.get_object()
        if tender.status != Tender.TenderStatus.PUBLISHED:
            return Response({'error': 'Tender must be published first'}, status=status.HTTP_400_BAD_REQUEST)
        
        tender.status = Tender.TenderStatus.BID_OPEN
        tender.save()
        return Response(TenderSerializer(tender).data)

    @action(detail=True, methods=['post'])
    def start_evaluation(self, request, pk=None):
        """Start bid evaluation."""
        tender = self.get_object()
        tender.status = Tender.TenderStatus.EVALUATION
        tender.save()
        return Response(TenderSerializer(tender).data)

    @action(detail=True, methods=['post'])
    def award(self, request, pk=None):
        """Award tender to winning bidder."""
        tender = self.get_object()
        winning_bid_id = request.data.get('winning_bid_id')
        
        if not winning_bid_id:
            return Response({'error': 'winning_bid_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            winning_bid = Bid.objects.get(id=winning_bid_id, tender=tender)
        except Bid.DoesNotExist:
            return Response({'error': 'Invalid bid'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update tender and bid status
        tender.status = Tender.TenderStatus.AWARDED
        tender.save()
        
        winning_bid.status = Bid.BidStatus.AWARDED
        winning_bid.save()
        
        # Mark other bids as rejected
        Bid.objects.filter(tender=tender).exclude(id=winning_bid_id).update(status=Bid.BidStatus.REJECTED)
        
        return Response(TenderSerializer(tender).data)

    @action(detail=True, methods=['get'])
    def bids(self, request, pk=None):
        """Get all bids for a tender."""
        tender = self.get_object()
        bids = tender.bids.select_related('bidder', 'evaluated_by').all()
        return Response(BidSerializer(bids, many=True).data)


class BidViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Bid submission and evaluation.
    """
    queryset = Bid.objects.select_related('tender', 'bidder', 'evaluated_by').all()
    serializer_class = BidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        tender_id = self.request.query_params.get('tender')
        if tender_id:
            queryset = queryset.filter(tender_id=tender_id)
        return queryset

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Evaluate a bid with scores."""
        bid = self.get_object()
        
        technical_score = request.data.get('technical_score')
        financial_score = request.data.get('financial_score')
        
        if technical_score is not None:
            bid.technical_score = technical_score
        if financial_score is not None:
            bid.financial_score = financial_score
        
        # Calculate combined score (70% technical, 30% financial by default)
        if bid.technical_score and bid.financial_score:
            bid.combined_score = (bid.technical_score * 0.7) + (bid.financial_score * 0.3)
        
        bid.status = Bid.BidStatus.FINANCIAL_EVAL if technical_score else Bid.BidStatus.TECHNICAL_EVAL
        bid.evaluated_by = request.user
        bid.evaluation_date = timezone.now()
        bid.save()
        
        return Response(BidSerializer(bid).data)

    @action(detail=True, methods=['post'])
    def qualify(self, request, pk=None):
        """Mark bid as qualified."""
        bid = self.get_object()
        bid.status = Bid.BidStatus.QUALIFIED
        bid.save()
        return Response(BidSerializer(bid).data)

    @action(detail=True, methods=['post'])
    def disqualify(self, request, pk=None):
        """Mark bid as disqualified."""
        bid = self.get_object()
        bid.status = Bid.BidStatus.DISQUALIFIED
        bid.technical_remarks = request.data.get('reason', '')
        bid.save()
        return Response(BidSerializer(bid).data)


class ContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contract lifecycle management.
    """
    queryset = Contract.objects.select_related(
        'tender', 'contractor', 'project', 'schedule_task', 'created_by'
    ).prefetch_related('variations').all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        return ContractSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Mark contract as signed."""
        contract = self.get_object()
        contract.status = Contract.ContractStatus.SIGNED
        contract.signing_date = request.data.get('signing_date', timezone.now().date())
        contract.save()
        return Response(ContractSerializer(contract).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate signed contract."""
        contract = self.get_object()
        if contract.status != Contract.ContractStatus.SIGNED:
            return Response({'error': 'Contract must be signed first'}, status=status.HTTP_400_BAD_REQUEST)
        
        contract.status = Contract.ContractStatus.ACTIVE
        contract.save()
        return Response(ContractSerializer(contract).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark contract as completed."""
        contract = self.get_object()
        contract.status = Contract.ContractStatus.COMPLETED
        contract.save()
        return Response(ContractSerializer(contract).data)

    @action(detail=True, methods=['get'])
    def variations(self, request, pk=None):
        """Get all variations for a contract."""
        contract = self.get_object()
        variations = contract.variations.all()
        return Response(VariationSerializer(variations, many=True).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get contract summary statistics."""
        contracts = self.get_queryset()
        summary = {
            'total_contracts': contracts.count(),
            'active_contracts': contracts.filter(status=Contract.ContractStatus.ACTIVE).count(),
            'total_value': contracts.aggregate(total=Sum('contract_value'))['total'] or 0,
            'total_variations': Variation.objects.filter(status=Variation.VariationStatus.APPROVED).aggregate(total=Sum('amount'))['total'] or 0,
        }
        return Response(summary)


class VariationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Variation/Change Order management.
    """
    queryset = Variation.objects.select_related(
        'contract', 'affected_task', 'proposed_by', 'approved_by'
    ).all()
    serializer_class = VariationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(contract_id=contract_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(proposed_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a variation."""
        variation = self.get_object()
        variation.status = Variation.VariationStatus.APPROVED
        variation.approved_by = request.user
        variation.approved_date = timezone.now().date()
        variation.save()
        
        # Update contract revised value
        contract = variation.contract
        contract.revised_value = contract.current_value
        if variation.time_impact_days > 0 and contract.end_date:
            from datetime import timedelta
            contract.revised_end_date = contract.end_date + timedelta(days=variation.time_impact_days)
        contract.save()
        
        return Response(VariationSerializer(variation).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a variation."""
        variation = self.get_object()
        variation.status = Variation.VariationStatus.REJECTED
        variation.approved_by = request.user
        variation.approved_date = timezone.now().date()
        variation.save()
        return Response(VariationSerializer(variation).data)
