from rest_framework import serializers
from .models import FundHead, BudgetLineItem, RABill, RetentionLedger, ProjectFinanceSettings, VariationRequest
from scheduling.models import ScheduleTask

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
        # The Government-Grade "Soft Warning" Logic check
        # We can't easily do a "soft warning" in a serializer (it either passes or fails).
        # So we allow it, but maybe tag it? 
        # For now, let's just validate math consistency.
        
        # Physical Progress Check (Strict or Warning? User said "Soft Warning")
        # Since it's a warning, we don't raise ValidationError here.
        # We handle the warning in the View/Frontend response.
        return data

    def create(self, validated_data):
        # Auto-Calculate Fields
        # 1. Total Amount
        gross = validated_data.get('gross_amount', 0)
        gst_pc = validated_data.get('gst_percentage', 18)
        gst_amt = (gross * gst_pc) / 100
        validated_data['gst_amount'] = gst_amt
        total = gross + gst_amt
        validated_data['total_amount'] = total

        # 2. Statutory Deductions
        tds_amt = validated_data.get('tds_amount', 0)
        cess_amt = validated_data.get('labour_cess_amount', 0)
        
        # 3. Retention (Check Settings)
        project = validated_data.get('project')
        retention_amt = validated_data.get('retention_amount', 0)
        
        try:
            settings = ProjectFinanceSettings.objects.get(project=project)
            if settings.enable_auto_retention and retention_amt == 0:
                # Auto calc 5% if not manually provided
                retention_amt = (gross * settings.default_retention_rate) / 100
                validated_data['retention_percentage'] = settings.default_retention_rate
        except ProjectFinanceSettings.DoesNotExist:
            pass
        
        validated_data['retention_amount'] = retention_amt

        # 4. Net Payable
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
        
        # Create Ledger Entry if retention > 0
        if retention_amt > 0:
            RetentionLedger.objects.create(
                bill=bill,
                amount_held=retention_amt
            )
        
        return bill
