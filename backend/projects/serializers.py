from rest_framework import serializers
from .models import Project, WorkPackage, FundingSource
from users.serializers import UserSerializer


class WorkPackageSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkPackage
        fields = [
            'id', 'project', 'contractor', 'contractor_name', 'name', 
            'description', 'status', 'budget', 'start_date', 'end_date',
            'agreement_no', 'agreement_date', 'responsible_staff',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_contractor_name(self, obj):
        if obj.contractor:
            return f"{obj.contractor.first_name} {obj.contractor.last_name}".strip() or obj.contractor.username
        return None


class FundingSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingSource
        fields = ['id', 'source', 'amount', 'document', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'document': {'required': False, 'allow_null': True},
        }


class ProjectSerializer(serializers.ModelSerializer):
    """
    Project serializer with master data references.
    
    IMPORTANT: Progress fields are READ-ONLY. They are computed by the
    ProjectProgressCalculator service and cannot be set via API.
    
    For reading: Returns nested objects with id, code, name for display.
    For writing: Accepts just the ID for each foreign key field.
    
    Most fields are optional to allow flexible project creation.
    """
    location = serializers.SerializerMethodField()
    work_packages = WorkPackageSerializer(many=True, read_only=True)
    
    # Read-only nested representations for display
    zone_name = serializers.CharField(source='zone.name', read_only=True, default='', allow_null=True)
    circle_name = serializers.CharField(source='circle.name', read_only=True, default='', allow_null=True)
    division_name = serializers.CharField(source='division.name', read_only=True, default='', allow_null=True)
    sub_division_name = serializers.CharField(source='sub_division.name', read_only=True, default='', allow_null=True)
    district_name = serializers.CharField(source='district.name', read_only=True, default='', allow_null=True)
    town_name = serializers.CharField(source='town.name', read_only=True, default='', allow_null=True)
    scheme_type_name = serializers.CharField(source='scheme_type.name', read_only=True, default='', allow_null=True)
    scheme_name = serializers.CharField(source='scheme.name', read_only=True, default='', allow_null=True)
    work_type_name = serializers.CharField(source='work_type.name', read_only=True, default='', allow_null=True)
    project_category_name = serializers.CharField(source='project_category.name', read_only=True, default='', allow_null=True)
    
    # Manager relationship
    manager_name = serializers.SerializerMethodField()
    
    # Nested fundings (writable)
    fundings = FundingSourceSerializer(many=True, read_only=False, required=False)
    
    # Computed display fields
    hierarchy_display = serializers.CharField(read_only=True)
    location_display = serializers.CharField(read_only=True)
    
    # Progress state display
    progress_state_display = serializers.CharField(
        source='get_progress_state_display', 
        read_only=True
    )
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 
            'start_date', 'end_date', 
            
            # All progress fields (READ-ONLY)
            'progress',  # Legacy
            'physical_progress',
            'financial_progress',
            'earned_value',
            'progress_state',
            'progress_state_display',
            'schedule_variance',
            
            # Financial
            'budget', 'spent', 'location', 
            
            # Hierarchy FKs (write) + names (read)
            'zone', 'zone_name',
            'circle', 'circle_name', 
            'division', 'division_name',
            'sub_division', 'sub_division_name',
            
            # Geography FKs (write) + names (read)
            'district', 'district_name',
            'town', 'town_name',
            
            # Classification FKs (write) + names (read)
            'scheme_type', 'scheme_type_name',
            'scheme', 'scheme_name',
            'work_type', 'work_type_name',
            'project_category', 'project_category_name',
            
            # Computed displays
            'hierarchy_display', 'location_display',
            
            # Legacy/other fields
            'lat', 'lng', 'address',
            'manager', 'manager_name',
            'admin_approval_reference_no', 'admin_approval_date', 'admin_approval_document',
            'fundings',
            'stakeholders', 'category', 
            'land_acquisition_status', 'work_packages',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 
            'created_at', 
            'updated_at', 
            'hierarchy_display', 
            'location_display',
            # CRITICAL: All computed progress fields are strictly read-only
            'progress',
            'physical_progress',
            'financial_progress',
            'earned_value',
            'progress_state',
            'schedule_variance',
        ]
        # Make most FK fields optional
        extra_kwargs = {
            'zone': {'required': False, 'allow_null': True},
            'circle': {'required': False, 'allow_null': True},
            'division': {'required': False, 'allow_null': True},
            'sub_division': {'required': False, 'allow_null': True},
            'district': {'required': False, 'allow_null': True},
            'town': {'required': False, 'allow_null': True},
            'scheme_type': {'required': False, 'allow_null': True},
            'scheme': {'required': False, 'allow_null': True},
            'work_type': {'required': False, 'allow_null': True},
            'project_category': {'required': False, 'allow_null': True},
            'manager': {'required': False, 'allow_null': True},
            'description': {'required': False, 'allow_blank': True},
            'start_date': {'required': False, 'allow_null': True},
            'end_date': {'required': False, 'allow_null': True},
        }

    def get_location(self, obj):
        """Returns location data for map display."""
        if obj.lat is not None and obj.lng is not None:
            return {
                "lat": obj.lat,
                "lng": obj.lng,
                "address": obj.address
            }
        return None
    
    def get_manager_name(self, obj):
        if obj.manager:
            return f"{obj.manager.first_name} {obj.manager.last_name}".strip() or obj.manager.username
        return None
    
    def create(self, validated_data):
        fundings_data = validated_data.pop('fundings', [])
        project = Project.objects.create(**validated_data)
        
        # Create funding sources
        for funding_data in fundings_data:
            FundingSource.objects.create(project=project, **funding_data)
        
        return project
    
    def update(self, instance, validated_data):
        fundings_data = validated_data.pop('fundings', None)
        
        # Update project fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update fundings if provided
        if fundings_data is not None:
            # Clear existing and recreate
            instance.fundings.all().delete()
            for funding_data in fundings_data:
                FundingSource.objects.create(project=instance, **funding_data)
        
        return instance


