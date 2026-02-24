from rest_framework import serializers
from .models import (
    FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings, 
    VariationRequest, BOQItem, BOQMilestoneMapping, ApprovalRequest, Notification,
    BOQExecution, ProgressCalculationLog
)
from scheduling.models import ScheduleTask

class BOQItemSerializer(serializers.ModelSerializer):
    linked_tasks = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ScheduleTask.objects.all(),
        required=False
    )
    
    class Meta:
        model = BOQItem
        fields = '__all__'
        read_only_fields = ['amount', 'created_at', 'updated_at']


class BOQExecutionSerializer(serializers.ModelSerializer):
    """Serializer for BOQ Execution entries with full audit trail."""
    boq_item_code = serializers.CharField(source='boq_item.item_code', read_only=True)
    boq_description = serializers.CharField(source='boq_item.description', read_only=True)
    boq_uom = serializers.CharField(source='boq_item.uom', read_only=True)
    boq_rate = serializers.DecimalField(source='boq_item.rate', max_digits=15, decimal_places=2, read_only=True)
    execution_value = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True)
    project_id = serializers.UUIDField(source='boq_item.project.id', read_only=True)
    project_name = serializers.CharField(source='boq_item.project.name', read_only=True)
    
    class Meta:
        model = BOQExecution
        fields = [
            'id', 'boq_item', 'boq_item_code', 'boq_description', 'boq_uom', 'boq_rate',
            'executed_quantity', 'execution_date', 'period_from', 'period_to',
            'ra_bill', 'status', 'remarks', 'supporting_documents',
            'execution_value', 'created_by', 'created_by_name', 
            'verified_by', 'verified_by_name', 'verified_at',
            'project_id', 'project_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'verified_by', 'verified_at', 
            'created_at', 'updated_at'
        ]
    
    def get_execution_value(self, obj):
        """Calculate the earned value for this execution."""
        return float(obj.executed_quantity * obj.boq_item.rate)
    
    def create(self, validated_data):
        # Auto-set created_by from request user
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class BOQExecutionCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating BOQ executions."""
    
    class Meta:
        model = BOQExecution
        fields = [
            'boq_item', 'executed_quantity', 'execution_date',
            'period_from', 'period_to', 'ra_bill', 'remarks', 'supporting_documents'
        ]
    
    def validate_executed_quantity(self, value):
        """Ensure executed quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError("Executed quantity must be positive")
        return value
    
    def validate(self, data):
        """Validate that execution doesn't exceed BOQ quantity."""
        boq_item = data.get('boq_item')
        new_qty = data.get('executed_quantity', 0)
        
        # Get total already executed for this BOQ item
        from django.db.models import Sum
        total_executed = BOQExecution.objects.filter(
            boq_item=boq_item,
            status__in=['VERIFIED', 'SUBMITTED', 'DRAFT']
        ).exclude(
            status='REJECTED'
        ).aggregate(total=Sum('executed_quantity'))['total'] or 0
        
        # Check if new execution would exceed BOQ quantity (with 10% tolerance for variations)
        max_allowed = float(boq_item.quantity) * 1.10  # 10% variation tolerance
        if float(total_executed) + float(new_qty) > max_allowed:
            raise serializers.ValidationError(
                f"Total executed ({float(total_executed) + float(new_qty)}) would exceed "
                f"BOQ quantity ({float(boq_item.quantity)}) by more than 10%"
            )
        
        return data


class ProgressCalculationLogSerializer(serializers.ModelSerializer):
    """Serializer for progress calculation audit logs."""
    project_name = serializers.CharField(source='project.name', read_only=True)
    triggered_by_name = serializers.CharField(source='triggered_by.username', read_only=True)
    
    class Meta:
        model = ProgressCalculationLog
        fields = [
            'id', 'project', 'project_name',
            'physical_progress', 'financial_progress', 'earned_value',
            'total_boq_value', 'total_executed_value',
            'boq_items_count', 'verified_executions_count',
            'physical_progress_delta', 'financial_progress_delta',
            'calculated_at', 'triggered_by', 'triggered_by_name'
        ]
        read_only_fields = fields  # All fields are read-only


class BOQMilestoneMappingSerializer(serializers.ModelSerializer):
    milestone_name = serializers.CharField(source='milestone.name', read_only=True)
    boq_item_code = serializers.CharField(source='boq_item.item_code', read_only=True)
    
    class Meta:
        model = BOQMilestoneMapping
        fields = '__all__'

class FundHeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundHead
        fields = '__all__'

class ProjectFinanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectFinanceSettings
        fields = '__all__'

class BudgetLineItemSerializer(serializers.ModelSerializer):
    milestone_name = serializers.CharField(source='milestone.name', read_only=True)
    fund_name = serializers.CharField(source='fund_head.name', read_only=True)
    class Meta:
        model = BudgetLineItem
        fields = '__all__'

class RABillSerializer(serializers.ModelSerializer):
    milestone_name = serializers.CharField(source='milestone.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contractor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RABill
        fields = '__all__'
        read_only_fields = ['retention_amount', 'net_payable', 'total_amount']

    def get_contractor_name(self, obj):
        return obj.contractor.username if obj.contractor else 'Unknown'

    def validate(self, data):
        return data

    def create(self, validated_data):
        gross = validated_data.get('gross_amount', 0)
        gst_pc = validated_data.get('gst_percentage', 18)
        gst_amt = (gross * gst_pc) / 100
        validated_data['gst_amount'] = gst_amt
        total = gross + gst_amt
        validated_data['total_amount'] = total

        tds_amt = validated_data.get('tds_amount', 0)
        cess_amt = validated_data.get('labour_cess_amount', 0)
        
        project = validated_data.get('project')
        retention_amt = validated_data.get('retention_amount', 0)
        
        try:
            settings = ProjectFinanceSettings.objects.get(project=project)
            if settings.enable_auto_retention and retention_amt == 0:
                retention_amt = (gross * settings.default_retention_rate) / 100
                validated_data['retention_percentage'] = settings.default_retention_rate
        except ProjectFinanceSettings.DoesNotExist:
            pass
        
        validated_data['retention_amount'] = retention_amt

        recoveries = (
            validated_data.get('mobilization_advance_recovery', 0) + 
            validated_data.get('material_advance_recovery', 0) +
            validated_data.get('plant_machinery_recovery', 0) +
            validated_data.get('penalty_amount', 0) + 
            validated_data.get('other_deductions', 0)
        )
        
        net = total - (tds_amt + cess_amt + retention_amt + recoveries)
        validated_data['net_payable'] = net

        bill = super().create(validated_data)
        
        if retention_amt > 0:
            RetentionLedger.objects.create(
                bill=bill,
                amount_held=retention_amt
            )
        
        return bill


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = '__all__'
        read_only_fields = ['requested_by', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']
