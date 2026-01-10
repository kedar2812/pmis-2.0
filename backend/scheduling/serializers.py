from rest_framework import serializers
from .models import ScheduleTask


class ScheduleTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for ScheduleTask model.
    
    Progress is COMPUTED based on the task's progress_method.
    Users provide inputs (executed_quantity, etc.) and the system calculates progress.
    
    Read-Only Fields:
    - computed_progress: System-calculated progress
    - weight: Can be set initially, but auto-resolved if not provided
    - weight_source: How the weight was determined
    - effective_progress: Progress with capping applied
    - earned_value: EV for this task
    """
    
    # Computed properties exposed as read-only
    effective_progress = serializers.FloatField(read_only=True)
    earned_value = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        read_only=True
    )
    duration_days = serializers.IntegerField(read_only=True)
    
    # Method display for UI
    progress_method_display = serializers.CharField(
        source='get_progress_method_display',
        read_only=True
    )
    weight_source_display = serializers.CharField(
        source='get_weight_source_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = ScheduleTask
        fields = [
            'id',
            'project',
            'parent_task',
            'name',
            'description',
            'wbs_code',
            
            # Schedule
            'start_date',
            'end_date',
            'duration_days',  # Computed
            
            # Progress Method & Weight
            'progress_method',
            'progress_method_display',
            'weight',
            'weight_source',
            'weight_source_display',
            
            # Quantity-Based Progress inputs
            'planned_quantity',
            'executed_quantity',
            'uom',
            
            # Cost-Based Progress inputs
            'budgeted_cost',
            'actual_cost',
            
            # Computed Progress (READ-ONLY)
            'computed_progress',
            'effective_progress',  # With capping applied
            'earned_value',
            
            # Capping & Validation
            'max_progress_without_approval',
            'is_approval_granted',
            
            # Manual Progress (restricted)
            'manual_progress_value',
            'manual_progress_justification',
            
            # Flags
            'is_milestone',
            'is_critical',
            
            # Import Support
            'external_id',
            'metadata',
            
            # Status
            'status',
            'status_display',
            
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'computed_progress',
            'created_at',
            'updated_at',
        ]

    def validate(self, data):
        """Validate task data."""
        # Date validation
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError(
                    {"end_date": "End date cannot be before start date."}
                )
        
        # Quantity validation for QUANTITY method
        progress_method = data.get('progress_method', 'QUANTITY')
        if progress_method == 'QUANTITY':
            planned = data.get('planned_quantity')
            if planned is not None and planned <= 0:
                raise serializers.ValidationError(
                    {"planned_quantity": "Planned quantity must be greater than 0 for quantity-based progress."}
                )
        
        # Manual progress justification required
        if progress_method == 'MANUAL':
            manual_value = data.get('manual_progress_value')
            justification = data.get('manual_progress_justification', '')
            if manual_value is not None and manual_value > 0 and not justification.strip():
                raise serializers.ValidationError(
                    {"manual_progress_justification": "Justification is required for manual progress entry."}
                )
        
        return data


class ScheduleTaskListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tasks.
    Used in list views for better performance.
    """
    effective_progress = serializers.FloatField(read_only=True)
    
    class Meta:
        model = ScheduleTask
        fields = [
            'id',
            'name',
            'wbs_code',
            'start_date',
            'end_date',
            'computed_progress',
            'effective_progress',
            'status',
            'is_milestone',
            'is_critical',
            'weight',
            'budgeted_cost',
        ]
        read_only_fields = ['id', 'computed_progress']
