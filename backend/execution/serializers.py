from rest_framework import serializers
from .models import DailySiteLog, SiteImage


class SiteImageSerializer(serializers.ModelSerializer):
    """
    Serializer for SiteImage.
    Handles image file upload and the is_primary flag.
    """
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SiteImage
        fields = [
            'id',
            'site_log',
            'image',
            'image_url',
            'is_primary',
            'caption',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_at', 'image_url']

    def get_image_url(self, obj):
        """Return absolute URL for the image file."""
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class DailySiteLogSerializer(serializers.ModelSerializer):
    """
    Serializer for DailySiteLog.

    Weather fields (temp_max, temp_min, rain_mm) are READ-ONLY — they are
    populated server-side by WeatherService.fetch_and_apply() in the view.

    'images' is a nested read representation (write images via SiteImageViewSet).
    """
    images = SiteImageSerializer(many=True, read_only=True)

    # Human-readable project/task names for display
    project_name = serializers.CharField(source='project.name', read_only=True)
    task_name = serializers.CharField(source='task.name', read_only=True)
    task_uom = serializers.CharField(source='task.uom', read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DailySiteLog
        fields = [
            'id',
            'project',
            'project_name',
            'task',
            'task_name',
            'task_uom',
            'date',
            'achieved_quantity',
            'remarks',
            'latitude',
            'longitude',
            # Weather (read-only, auto-set by WeatherService)
            'weather_temp_max',
            'weather_temp_min',
            'weather_rain_mm',
            # Audit
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            # Nested images (read-only)
            'images',
        ]
        read_only_fields = [
            'id',
            'date',
            'weather_temp_max',
            'weather_temp_min',
            'weather_rain_mm',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def validate(self, data):
        """
        Ensure the selected task belongs to the selected project.
        Prevents cross-project data corruption.
        """
        project = data.get('project') or getattr(self.instance, 'project', None)
        task = data.get('task') or getattr(self.instance, 'task', None)

        if project and task:
            if str(task.project_id) != str(project.id):
                raise serializers.ValidationError({
                    'task': (
                        f"Task '{task.name}' does not belong to the selected project "
                        f"'{project.name}'. Please select a valid task."
                    )
                })
        return data


class DailySiteLogListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views — avoids N+1 on images.
    """
    project_name = serializers.CharField(source='project.name', read_only=True)
    task_name = serializers.CharField(source='task.name', read_only=True)
    primary_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DailySiteLog
        fields = [
            'id',
            'project',
            'project_name',
            'task',
            'task_name',
            'date',
            'achieved_quantity',
            'weather_temp_max',
            'weather_temp_min',
            'weather_rain_mm',
            'latitude',
            'longitude',
            'primary_image_url',
            'created_at',
        ]

    def get_primary_image_url(self, obj):
        request = self.context.get('request')
        primary = obj.images.filter(is_primary=True).first()
        if primary and primary.image and request:
            return request.build_absolute_uri(primary.image.url)
        return None
