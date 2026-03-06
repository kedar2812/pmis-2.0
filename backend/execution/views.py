import logging

from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, generics, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from scheduling.models import ScheduleTask
from scheduling.serializers import ScheduleTaskListSerializer
from .models import DailySiteLog, SiteImage
from .serializers import (
    DailySiteLogSerializer,
    DailySiteLogListSerializer,
    SiteImageSerializer,
)
from .services import WeatherService

logger = logging.getLogger(__name__)


class DailySiteLogViewSet(viewsets.ModelViewSet):
    """
    CRUD for DailySiteLog entries.

    On **create**, the WeatherService is called before the instance is saved
    to auto-populate weather fields from the Open-Meteo API.

    Supports filtering by `project` and `task` query params.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['project', 'task', 'date']
    ordering_fields = ['date', 'created_at', 'achieved_quantity']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return (
            DailySiteLog.objects
            .select_related('project', 'task', 'created_by')
            .prefetch_related(
                Prefetch(
                    'images',
                    queryset=SiteImage.objects.order_by('-is_primary', '-uploaded_at')
                )
            )
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return DailySiteLogListSerializer
        return DailySiteLogSerializer

    def perform_create(self, serializer):
        """
        Inject weather data before saving. Weather fields are set on the
        unsaved instance; then the instance is fully saved once.
        Created_by is set from the authenticated request user.
        """
        # Build the unsaved instance first so WeatherService can read lat/lon
        instance = serializer.save(created_by=self.request.user)

        # Fetch weather and update the just-saved instance's weather fields
        # (separate DB update is acceptable — weather fetch is async-safe)
        WeatherService.fetch_and_apply(instance)
        if any([
            instance.weather_temp_max is not None,
            instance.weather_temp_min is not None,
            instance.weather_rain_mm is not None,
        ]):
            instance.save(update_fields=[
                'weather_temp_max', 'weather_temp_min', 'weather_rain_mm'
            ])

    @action(detail=True, methods=['get'], url_path='images')
    def list_images(self, request, pk=None):
        """Return all images for a specific site log."""
        log = self.get_object()
        images = log.images.all()
        serializer = SiteImageSerializer(
            images, many=True, context={'request': request}
        )
        return Response(serializer.data)


class SiteImageViewSet(viewsets.ModelViewSet):
    """
    CRUD for SiteImage entries.
    Accepts multipart/form-data for image file upload.

    Critical design note on the async FK flow:
    -  The frontend MUST first POST to /execution/logs/ and obtain the returned log.id.
    -  Only then POST to /execution/images/ with site_log=<log_id>.
    -  This ensures the FK is always valid at insert time.
    """
    queryset = SiteImage.objects.select_related('site_log__project')
    serializer_class = SiteImageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['site_log', 'is_primary']


class ProjectTaskListView(generics.ListAPIView):
    """
    GET /api/execution/tasks/?project=<project_id>

    Returns a lightweight list of ScheduleTasks for a given project.
    Used by the frontend `SiteExecution` form to populate the Task dropdown
    after the user selects a project.

    Required query param: `project` (Project PK / UUID)
    """
    serializer_class = ScheduleTaskListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if not project_id:
            return ScheduleTask.objects.none()
        return (
            ScheduleTask.objects
            .filter(project_id=project_id)
            .select_related('project')
            .order_by('wbs_code', 'name')
        )
