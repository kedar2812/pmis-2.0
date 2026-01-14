from rest_framework import serializers
from .models import FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings, VariationRequest, BOQItem, BOQMilestoneMapping, ApprovalRequest, Notification
from scheduling.models import ScheduleTask

class BOQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOQItem
        fields = '__all__'
        read_only_fields = ['amount', 'created_at', 'updated_at']

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

