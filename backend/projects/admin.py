from django.contrib import admin
from .models import Project, WorkPackage


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Admin configuration for Project model.
    
    Progress fields are READ-ONLY because they are computed by the
    ProjectProgressCalculator service. They cannot be edited directly.
    """
    
    list_display = [
        'name', 
        'status', 
        'physical_progress_display',
        'financial_progress_display',
        'progress_state',
        'budget',
        'created_at'
    ]
    
    list_filter = ['status', 'progress_state', 'zone', 'circle']
    
    search_fields = ['name', 'description']
    
    readonly_fields = [
        # All computed progress fields are strictly read-only
        'physical_progress',
        'financial_progress',
        'earned_value',
        'progress_state',
        'schedule_variance',
        'progress',  # Legacy field
        # Timestamps
        'created_at',
        'updated_at',
        # Computed display properties
        'hierarchy_display',
        'location_display',
    ]
    
    fieldsets = [
        ('Basic Information', {
            'fields': [
                'name',
                'description',
                'status',
                ('start_date', 'end_date'),
            ]
        }),
        ('Progress (Read-Only - Computed from Tasks)', {
            'fields': [
                ('physical_progress', 'financial_progress'),
                ('earned_value', 'schedule_variance'),
                'progress_state',
                'progress',
            ],
            'description': 'These fields are computed automatically from task-level data. They cannot be edited directly.',
        }),
        ('Financial', {
            'fields': [
                ('budget', 'spent'),
            ]
        }),
        ('Hierarchy', {
            'fields': [
                'zone',
                'circle',
                'division',
                'sub_division',
            ],
            'classes': ['collapse'],
        }),
        ('Geography', {
            'fields': [
                'district',
                'town',
                ('lat', 'lng'),
                'address',
            ],
            'classes': ['collapse'],
        }),
        ('Classification', {
            'fields': [
                'scheme_type',
                'scheme',
                'work_type',
                'project_category',
            ],
            'classes': ['collapse'],
        }),
        ('Other', {
            'fields': [
                'manager',
                'stakeholders',
                'category',
                'land_acquisition_status',
            ],
            'classes': ['collapse'],
        }),
        ('Timestamps', {
            'fields': [
                ('created_at', 'updated_at'),
            ],
        }),
    ]
    
    def physical_progress_display(self, obj):
        """Formatted physical progress for list display."""
        return f"{obj.physical_progress:.1f}%"
    physical_progress_display.short_description = 'Physical %'
    physical_progress_display.admin_order_field = 'physical_progress'
    
    def financial_progress_display(self, obj):
        """Formatted financial progress for list display."""
        return f"{obj.financial_progress:.1f}%"
    financial_progress_display.short_description = 'Financial %'
    financial_progress_display.admin_order_field = 'financial_progress'


@admin.register(WorkPackage)
class WorkPackageAdmin(admin.ModelAdmin):
    """Admin configuration for WorkPackage model."""
    
    list_display = [
        'name',
        'project',
        'contractor',
        'status',
        'budget',
        'start_date',
        'end_date',
    ]
    
    list_filter = ['status', 'project']
    
    search_fields = ['name', 'description', 'project__name']
    
    readonly_fields = ['created_at', 'updated_at']
