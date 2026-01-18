from django.contrib import admin
from .models import (
    FundHead, ProjectFinanceSettings, BudgetLineItem, VariationRequest,
    RABill, RetentionLedger, BOQItem, BOQMilestoneMapping,
    ApprovalRequest, Notification, BOQExecution, ProgressCalculationLog
)


@admin.register(FundHead)
class FundHeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'allocating_authority', 'total_amount', 'balance_available', 'start_date', 'end_date']
    search_fields = ['name', 'allocating_authority']
    list_filter = ['allocating_authority']


@admin.register(ProjectFinanceSettings)
class ProjectFinanceSettingsAdmin(admin.ModelAdmin):
    list_display = ['project', 'enable_auto_retention', 'default_retention_rate', 'last_verified_at']
    list_filter = ['enable_auto_retention']
    search_fields = ['project__name']


@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display = ['project', 'milestone', 'cost_category', 'amount', 'version', 'is_active']
    list_filter = ['cost_category', 'is_active', 'version']
    search_fields = ['project__name', 'milestone__name']


@admin.register(VariationRequest)
class VariationRequestAdmin(admin.ModelAdmin):
    list_display = ['original_budget', 'requested_amount', 'status', 'created_at']
    list_filter = ['status']


@admin.register(RABill)
class RABillAdmin(admin.ModelAdmin):
    list_display = ['bill_no', 'project', 'contractor', 'gross_amount', 'net_payable', 'status', 'bill_date']
    list_filter = ['status', 'bill_date']
    search_fields = ['bill_no', 'project__name', 'work_order_no']
    date_hierarchy = 'bill_date'


@admin.register(RetentionLedger)
class RetentionLedgerAdmin(admin.ModelAdmin):
    list_display = ['bill', 'amount_held', 'amount_released', 'status', 'release_date']
    list_filter = ['status']


@admin.register(BOQItem)
class BOQItemAdmin(admin.ModelAdmin):
    list_display = ['item_code', 'project', 'description_short', 'uom', 'quantity', 'rate', 'amount', 'status']
    list_filter = ['status', 'project']
    search_fields = ['item_code', 'description', 'project__name']
    readonly_fields = ['amount']
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'


@admin.register(BOQMilestoneMapping)
class BOQMilestoneMappingAdmin(admin.ModelAdmin):
    list_display = ['boq_item', 'milestone', 'percentage_allocated', 'created_at']
    list_filter = ['boq_item__project']
    search_fields = ['boq_item__item_code', 'milestone__name']


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'request_type', 'project', 'requested_by', 'status', 'created_at']
    list_filter = ['status', 'request_type']
    search_fields = ['title', 'project__name', 'requested_by__username']
    date_hierarchy = 'created_at'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['title', 'message', 'user__username']
    date_hierarchy = 'created_at'


@admin.register(BOQExecution)
class BOQExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'boq_item', 'executed_quantity', 'execution_date', 
        'status', 'created_by', 'verified_by', 'verified_at'
    ]
    list_filter = ['status', 'execution_date', 'boq_item__project']
    search_fields = ['boq_item__item_code', 'boq_item__project__name', 'created_by__username']
    date_hierarchy = 'execution_date'
    readonly_fields = ['verified_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Execution Details', {
            'fields': ('boq_item', 'executed_quantity', 'execution_date', 'period_from', 'period_to')
        }),
        ('Status & Verification', {
            'fields': ('status', 'verified_by', 'verified_at', 'remarks')
        }),
        ('Links', {
            'fields': ('ra_bill', 'supporting_documents')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProgressCalculationLog)
class ProgressCalculationLogAdmin(admin.ModelAdmin):
    list_display = [
        'project', 'physical_progress', 'financial_progress', 
        'earned_value', 'calculated_at', 'triggered_by'
    ]
    list_filter = ['calculated_at', 'project']
    search_fields = ['project__name', 'triggered_by__username']
    date_hierarchy = 'calculated_at'
    readonly_fields = [
        'project', 'physical_progress', 'financial_progress', 'earned_value',
        'total_boq_value', 'total_executed_value', 'boq_items_count',
        'verified_executions_count', 'physical_progress_delta', 
        'financial_progress_delta', 'calculated_at', 'triggered_by'
    ]  # All fields read-only - this is an audit log
