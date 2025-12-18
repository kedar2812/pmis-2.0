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
    location = serializers.SerializerMethodField()
    work_packages = WorkPackageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 
            'start_date', 'end_date', 'progress', 
            'budget', 'spent', 'location', 
            'manager', 'stakeholders', 'category', 
            'land_acquisition_status', 'work_packages'
        ]

    def get_location(self, obj):
        if obj.lat is not None and obj.lng is not None:
            return {
                "lat": obj.lat,
                "lng": obj.lng,
                "address": obj.address
            }
        return None
