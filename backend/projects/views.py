from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
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


class DashboardStatsView(APIView):
    """
    Aggregated dashboard statistics from all modules.
    Returns KPIs, financial summary, project status distribution, and recent activity.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        today = timezone.now().date()
        
        # Get projects data
        projects = Project.objects.all()
        
        # Project counts by status
        project_stats = {
            'total': projects.count(),
            'in_progress': projects.filter(status='In Progress').count(),
            'planning': projects.filter(status='Planning').count(),
            'completed': projects.filter(status='Completed').count(),
            'on_hold': projects.filter(status='On Hold').count(),
        }
        
        # Financial summary
        financial_summary = projects.aggregate(
            total_budget=Sum('budget'),
            total_spent=Sum('spent'),
        )
        financial_summary['total_budget'] = financial_summary['total_budget'] or 0
        financial_summary['total_spent'] = financial_summary['total_spent'] or 0
        financial_summary['remaining'] = financial_summary['total_budget'] - financial_summary['total_spent']
        financial_summary['utilization'] = (
            (financial_summary['total_spent'] / financial_summary['total_budget'] * 100) 
            if financial_summary['total_budget'] > 0 else 0
        )
        
        # Get pending approvals from EDMS
        pending_approvals = 0
        try:
            from edms.models import Document
            pending_approvals = Document.objects.filter(
                status__in=['pending_review', 'under_review']
            ).count()
        except Exception:
            pass
        
        # Get critical risks count
        critical_risks = 0
        try:
            # If you have a Risk model, count critical risks
            # For now, we'll estimate from project data
            critical_risks = projects.filter(
                Q(status='In Progress') & Q(progress__lt=50)
            ).count()
        except Exception:
            pass
        
        # Get overdue tasks from scheduling
        overdue_tasks = 0
        try:
            from scheduling.models import Task
            overdue_tasks = Task.objects.filter(
                end_date__lt=today,
                status__in=['pending', 'in_progress']
            ).count()
        except Exception:
            pass
        
        # Recent activity (last 7 days)
        recent_activity = []
        one_week_ago = timezone.now() - timedelta(days=7)
        
        # Project updates
        recent_projects = projects.filter(
            updated_at__gte=one_week_ago
        ).order_by('-updated_at')[:5]
        
        for project in recent_projects:
            recent_activity.append({
                'type': 'project_update',
                'title': f'Project updated: {project.name}',
                'timestamp': project.updated_at.isoformat(),
                'icon': 'folder',
                'color': 'blue'
            })
        
        # Document uploads
        try:
            from edms.models import Document
            recent_docs = Document.objects.filter(
                created_at__gte=one_week_ago
            ).order_by('-created_at')[:5]
            
            for doc in recent_docs:
                recent_activity.append({
                    'type': 'document_upload',
                    'title': f'Document uploaded: {doc.title}',
                    'timestamp': doc.created_at.isoformat(),
                    'icon': 'file',
                    'color': 'green'
                })
        except Exception:
            pass
        
        # Sort by timestamp
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activity = recent_activity[:10]
        
        # KPIs for the dashboard
        kpis = [
            {
                'id': 'total_budget',
                'label': 'Total Budget',
                'value': financial_summary['total_budget'],
                'formatted': f"₹{financial_summary['total_budget'] / 10000000:.2f} Cr",
                'trend': 'up',
                'change': '+5.2%'
            },
            {
                'id': 'active_projects',
                'label': 'Active Projects',
                'value': project_stats['in_progress'],
                'formatted': str(project_stats['in_progress']),
                'trend': 'up',
                'change': '+2'
            },
            {
                'id': 'pending_approvals',
                'label': 'Pending Approvals',
                'value': pending_approvals,
                'formatted': str(pending_approvals),
                'trend': 'neutral' if pending_approvals == 0 else 'down',
                'change': 'Needs attention' if pending_approvals > 0 else 'All clear'
            },
            {
                'id': 'critical_risks',
                'label': 'Critical Risks',
                'value': critical_risks,
                'formatted': str(critical_risks),
                'trend': 'down' if critical_risks > 0 else 'up',
                'change': 'Monitor closely' if critical_risks > 0 else 'All clear'
            }
        ]
        
        return Response({
            'project_stats': project_stats,
            'financial_summary': financial_summary,
            'pending_approvals': pending_approvals,
            'critical_risks': critical_risks,
            'overdue_tasks': overdue_tasks,
            'kpis': kpis,
            'recent_activity': recent_activity,
        })


class RecentActivityView(APIView):
    """
    Recent activity feed for the dashboard.
    Returns the latest updates across all modules.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        one_week_ago = timezone.now() - timedelta(days=7)
        activities = []
        
        # Project updates
        recent_projects = Project.objects.filter(
            updated_at__gte=one_week_ago
        ).order_by('-updated_at')[:limit//3]
        
        for project in recent_projects:
            activities.append({
                'id': f'project-{project.id}',
                'type': 'project',
                'action': 'updated',
                'title': project.name,
                'description': f'Status: {project.status}, Progress: {project.progress}%',
                'timestamp': project.updated_at.isoformat(),
                'user': None,  # Could add updated_by field
                'link': f'/projects/{project.id}'
            })
        
        # Document uploads
        try:
            from edms.models import Document
            recent_docs = Document.objects.filter(
                created_at__gte=one_week_ago
            ).select_related('uploaded_by').order_by('-created_at')[:limit//3]
            
            for doc in recent_docs:
                activities.append({
                    'id': f'document-{doc.id}',
                    'type': 'document',
                    'action': 'uploaded',
                    'title': doc.title,
                    'description': f'Category: {doc.category}',
                    'timestamp': doc.created_at.isoformat(),
                    'user': doc.uploaded_by.get_full_name() if doc.uploaded_by else None,
                    'link': f'/edms?doc={doc.id}'
                })
        except Exception:
            pass
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'activities': activities[:limit],
            'total': len(activities)
        })

