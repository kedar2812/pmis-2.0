from rest_framework import serializers
from .models import Tender, Bid, Contract, Variation


class TenderSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    work_package_name = serializers.CharField(source='work_package.name', read_only=True)
    schedule_task_name = serializers.CharField(source='schedule_task.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_tender_type_display', read_only=True)
    bids_count = serializers.IntegerField(source='bids.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_no', 'title', 'description',
            'project', 'project_name',
            'schedule_task', 'schedule_task_name',
            'work_package', 'work_package_name',
            'estimated_value', 'earnest_money_deposit',
            'tender_type', 'type_display',
            'status', 'status_display',
            'publish_date', 'submission_deadline', 'bid_opening_date',
            'nicdc_portal_ref',
            'bids_count',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class BidSerializer(serializers.ModelSerializer):
    tender_no = serializers.CharField(source='tender.tender_no', read_only=True)
    bidder_name = serializers.CharField(source='bidder.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Bid
        fields = [
            'id', 'tender', 'tender_no',
            'bidder', 'bidder_name',
            'bid_amount',
            'technical_score', 'financial_score', 'combined_score',
            'status', 'status_display',
            'submission_date', 'evaluation_date',
            'technical_remarks', 'financial_remarks',
            'evaluated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'submission_date', 'created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    tender_no = serializers.CharField(source='tender.tender_no', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    schedule_task_name = serializers.CharField(source='schedule_task.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_value = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_variations = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    variations_count = serializers.IntegerField(source='variations.count', read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'contract_no',
            'tender', 'tender_no',
            'winning_bid',
            'contractor', 'contractor_name',
            'project', 'project_name',
            'schedule_task', 'schedule_task_name',
            'contract_value', 'revised_value', 'current_value', 'total_variations',
            'performance_guarantee',
            'signing_date', 'start_date', 'end_date', 'revised_end_date',
            'status', 'status_display',
            'variations_count',
            'created_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'current_value', 'total_variations']


class VariationSerializer(serializers.ModelSerializer):
    contract_no = serializers.CharField(source='contract.contract_no', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_variation_type_display', read_only=True)
    affected_task_name = serializers.CharField(source='affected_task.name', read_only=True)
    proposed_by_name = serializers.CharField(source='proposed_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = Variation
        fields = [
            'id', 'contract', 'contract_no',
            'variation_no', 'title', 'description',
            'variation_type', 'type_display',
            'amount', 'time_impact_days',
            'affected_task', 'affected_task_name',
            'status', 'status_display',
            'proposed_by', 'proposed_by_name',
            'approved_by', 'approved_by_name', 'approved_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'proposed_by', 'created_at', 'updated_at']


# Summary/List Serializers for optimized listing
class TenderListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bids_count = serializers.IntegerField(source='bids.count', read_only=True)

    class Meta:
        model = Tender
        fields = ['id', 'tender_no', 'title', 'project_name', 'estimated_value', 
                  'tender_type', 'status', 'status_display', 'submission_deadline', 'bids_count']


class ContractListSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Contract
        fields = ['id', 'contract_no', 'contractor_name', 'project_name', 
                  'contract_value', 'status', 'status_display', 'start_date', 'end_date']
