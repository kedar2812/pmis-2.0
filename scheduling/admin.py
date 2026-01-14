from django.contrib import admin
from .models import ScheduleTask


@admin.register(ScheduleTask)
class ScheduleTaskAdmin(admin.ModelAdmin):
    """
    Admin configuration for ScheduleTask model.
    
    computed_progress is READ-ONLY as it's calculated by the system.
    """
    
    list_display = [
        'name',
        'project',
        'progress_method',
        'computed_progress_display',
        'weight',
        'status',
        'start_date',
        'end_date',
    ]
    
    list_filter = ['status', 'progress_method', 'is_milestone', 'project']
    
    search_fields = ['name', 'project__name', 'wbs_code']
    
    readonly_fields = [
        'id',
        'computed_progress',
        'created_at',
        'updated_at',
    ]
    
    fieldsets = [
        ('Basic Information', {
            'fields': [
                'project',
                'parent_task',
                'name',
                'description',
                'wbs_code',
            ]
        }),
        ('Schedule', {
            'fields': [
                ('start_date', 'end_date'),
            ]
        }),
        ('Progress Method & Weight', {
            'fields': [
                'progress_method',
                ('weight', 'weight_source'),
            ],
            'description': 'Define how progress is measured for this task.',
        }),
        ('Quantity-Based Progress (if method = QUANTITY)', {
            'fields': [
                ('planned_quantity', 'executed_quantity', 'uom'),
            ],
            'classes': ['collapse'],
        }),
        ('Cost-Based Progress (if method = COST)', {
            'fields': [
                ('budgeted_cost', 'actual_cost'),
            ],
            'classes': ['collapse'],
        }),
        ('Computed Progress (Read-Only)', {
            'fields': [
                'computed_progress',
                ('max_progress_without_approval', 'is_approval_granted'),
            ],
            'description': 'Progress is calculated automatically based on the method above.',
        }),
        ('Manual Progress (Restricted)', {
            'fields': [
                'manual_progress_value',
                'manual_progress_justification',
            ],
            'classes': ['collapse'],
        }),
        ('Flags', {
            'fields': [
                ('is_milestone', 'is_critical'),
                'status',
            ]
        }),
        ('Import Support', {
            'fields': [
                'external_id',
                'metadata',
            ],
            'classes': ['collapse'],
        }),
        ('Timestamps', {
            'fields': [
                ('created_at', 'updated_at'),
            ],
        }),
    ]
    
    def computed_progress_display(self, obj):
        """Formatted progress for list display."""
        return f"{obj.computed_progress:.1f}%"
    computed_progress_display.short_description = 'Progress'
    computed_progress_display.admin_order_field = 'computed_progress'
