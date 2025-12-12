from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 
            'start_date', 'end_date', 'progress', 
            'budget', 'spent', 'location', 
            'manager', 'stakeholders', 'category', 
            'land_acquisition_status'
        ]

    def get_location(self, obj):
        if obj.lat is not None and obj.lng is not None:
            return {
                "lat": obj.lat,
                "lng": obj.lng,
                "address": obj.address
            }
        return None
