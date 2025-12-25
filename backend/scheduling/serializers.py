from rest_framework import serializers
from .models import ScheduleTask

class ScheduleTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleTask
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError("End date cannot be before start date.")
        return data
