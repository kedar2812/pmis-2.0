from rest_framework import viewsets, permissions
from .models import ScheduleTask
from .serializers import ScheduleTaskSerializer

class ScheduleTaskViewSet(viewsets.ModelViewSet):
    queryset = ScheduleTask.objects.all()
    serializer_class = ScheduleTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('start_date')
