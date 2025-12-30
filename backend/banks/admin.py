from django.contrib import admin
from .models import BankBranch


@admin.register(BankBranch)
class BankBranchAdmin(admin.ModelAdmin):
    """
    Admin interface for managing bank branches and IFSC codes.
    Allows customers to view, search, and update IFSC data easily.
    """
    
    list_display = ['ifsc_code', 'bank_name', 'branch_name', 'city', 'state', 'is_active']
    list_filter = ['bank_name', 'state', 'is_active', 'rtgs', 'neft', 'imps', 'upi']
    search_fields = ['ifsc_code', 'bank_name', 'branch_name', 'city', 'district', 'state']
    readonly_fields = ['created_at', 'updated_at', 'data_source']
    
    fieldsets = (
        ('Branch Identification', {
            'fields': ('ifsc_code', 'bank_name', 'branch_name', 'is_active')
        }),
        ('Location Details', {
            'fields': ('address', 'city', 'district', 'state')
        }),
        ('Contact Information', {
            'fields': ('contact',)
        }),
        ('Payment Systems', {
            'fields': ('rtgs', 'neft', 'imps', 'upi'),
            'description': 'Enable/disable payment systems for this branch'
        }),
        ('Data Management', {
            'fields': ('data_source', 'last_verified', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_branches', 'deactivate_branches', 'enable_upi']
    
    def activate_branches(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} branch(es) activated successfully.')
    activate_branches.short_description = 'Activate selected branches'
    
    def deactivate_branches(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} branch(es) deactivated successfully.')
    deactivate_branches.short_description = 'Deactivate selected branches'
    
    def enable_upi(self, request, queryset):
        updated = queryset.update(upi=True)
        self.message_user(request, f'UPI enabled for {updated} branch(es).')
    enable_upi.short_description = 'Enable UPI for selected branches'
    
    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }
