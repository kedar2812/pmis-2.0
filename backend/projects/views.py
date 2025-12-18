from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Project, WorkPackage
from .serializers import ProjectSerializer, WorkPackageSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

class WorkPackageViewSet(viewsets.ModelViewSet):
    queryset = WorkPackage.objects.all()
    serializer_class = WorkPackageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkPackage.objects.all()
        project_id = self.request.query_params.get('project', None)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset
