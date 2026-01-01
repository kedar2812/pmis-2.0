from rest_framework import serializers
from .models import Project, WorkPackage
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


class ProjectSerializer(serializers.ModelSerializer):
    """
    Project serializer with master data references.
    
    For reading: Returns nested objects with id, code, name for display.
    For writing: Accepts just the ID for each foreign key field.
    """
    location = serializers.SerializerMethodField()
    work_packages = WorkPackageSerializer(many=True, read_only=True)
    
    # Read-only nested representations for display
    zone_name = serializers.CharField(source='zone.name', read_only=True, default='')
    circle_name = serializers.CharField(source='circle.name', read_only=True, default='')
    division_name = serializers.CharField(source='division.name', read_only=True, default='')
    sub_division_name = serializers.CharField(source='sub_division.name', read_only=True, default='')
    district_name = serializers.CharField(source='district.name', read_only=True, default='')
    town_name = serializers.CharField(source='town.name', read_only=True, default='')
    scheme_type_name = serializers.CharField(source='scheme_type.name', read_only=True, default='')
    scheme_name = serializers.CharField(source='scheme.name', read_only=True, default='')
    work_type_name = serializers.CharField(source='work_type.name', read_only=True, default='')
    project_category_name = serializers.CharField(source='project_category.name', read_only=True, default='')
    
    # Computed display fields
    hierarchy_display = serializers.CharField(read_only=True)
    location_display = serializers.CharField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 
            'start_date', 'end_date', 'progress', 
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
            'manager', 'stakeholders', 'category', 
            'land_acquisition_status', 'work_packages',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 
            'hierarchy_display', 'location_display'
        ]

    def get_location(self, obj):
        """Returns location data for map display."""
        if obj.lat is not None and obj.lng is not None:
            return {
                "lat": obj.lat,
                "lng": obj.lng,
                "address": obj.address
            }
        return None

