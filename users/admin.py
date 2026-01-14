from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'account_status', 'company_name', 'department', 'is_active')
    list_filter = ('role', 'account_status', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'company_name', 'pan_number')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Status', {
            'fields': ('role', 'account_status', 'department', 'designation', 'phone_number')
        }),
        ('Contractor Information', {
            'fields': ('contractor_id', 'company_name', 'pan_number', 'gstin_number', 'eproc_number'),
            'classes': ('collapse',)
        }),
        ('Address', {
            'fields': ('building_number', 'street', 'area', 'city', 'state', 'country', 'zip_code'),
            'classes': ('collapse',)
        }),
        ('Bank Details', {
            'fields': ('bank_name', 'bank_branch', 'ifsc_code', 'account_number', 'account_type'),
            'classes': ('collapse',)
        }),
        ('Invite/Approval', {
            'fields': ('invite_token', 'invite_expires_at', 'approved_by', 'approved_at', 'rejection_reason'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('invite_token', 'invite_expires_at', 'approved_at')
    
    # Add filters for quick actions
    actions = ['approve_users', 'reject_users', 'activate_users', 'deactivate_users']
    
    def approve_users(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(account_status='PENDING_APPROVAL').update(
            account_status='ACTIVE',
            is_active=True,
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(request, f'{updated} users approved.')
    approve_users.short_description = 'Approve selected pending users'
    
    def reject_users(self, request, queryset):
        updated = queryset.filter(account_status='PENDING_APPROVAL').update(
            account_status='DISABLED',
            is_active=False
        )
        self.message_user(request, f'{updated} users rejected.')
    reject_users.short_description = 'Reject selected pending users'
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True, account_status='ACTIVE')
        self.message_user(request, f'{updated} users activated.')
    activate_users.short_description = 'Activate selected users'
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False, account_status='DISABLED')
        self.message_user(request, f'{updated} users deactivated.')
    deactivate_users.short_description = 'Deactivate selected users'
