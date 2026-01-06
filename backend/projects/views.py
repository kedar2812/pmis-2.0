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
    Enhanced with procurement, schedule health, alerts, and top projects.
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
        overdue_approvals = 0
        try:
            from edms.models import Document
            pending_docs = Document.objects.filter(status__in=['pending_review', 'under_review'])
            pending_approvals = pending_docs.count()
            # Overdue = pending > 48 hours
            two_days_ago = timezone.now() - timedelta(hours=48)
            overdue_approvals = pending_docs.filter(created_at__lt=two_days_ago).count()
        except Exception:
            pass
        
        # Get critical risks count
        critical_risks = 0
        try:
            critical_risks = projects.filter(
                Q(status='In Progress') & Q(progress__lt=50)
            ).count()
        except Exception:
            pass
        
        # Schedule health from scheduling module
        schedule_health = {
            'on_track': 0,
            'delayed': 0,
            'critical': 0,
            'percentage': 100
        }
        overdue_tasks = 0
        try:
            from scheduling.models import ScheduleTask
            all_tasks = ScheduleTask.objects.all()
            total_tasks = all_tasks.count()
            
            on_track = all_tasks.filter(
                Q(status='COMPLETED') | 
                (Q(status='IN_PROGRESS') & Q(end_date__gte=today))
            ).count()
            delayed = all_tasks.filter(
                status='DELAYED'
            ).count()
            overdue_tasks = all_tasks.filter(
                end_date__lt=today,
                status__in=['PLANNED', 'IN_PROGRESS']
            ).count()
            
            schedule_health = {
                'on_track': on_track,
                'delayed': delayed,
                'critical': overdue_tasks,
                'total_tasks': total_tasks,
                'percentage': round((on_track / total_tasks * 100) if total_tasks > 0 else 100, 1)
            }
        except Exception:
            pass
        
        # Procurement data
        procurement_summary = {
            'active_tenders': 0,
            'open_bids': 0,
            'active_contracts': 0,
            'pending_variations': 0
        }
        try:
            from procurement.models import Tender, Contract, Variation
            procurement_summary = {
                'active_tenders': Tender.objects.filter(status__in=['PUBLISHED', 'BID_OPEN', 'EVALUATION']).count(),
                'open_bids': Tender.objects.filter(status='BID_OPEN').count(),
                'active_contracts': Contract.objects.filter(status='ACTIVE').count(),
                'pending_variations': Variation.objects.filter(status__in=['PROPOSED', 'UNDER_REVIEW']).count()
            }
        except Exception:
            pass
        
        # Alerts - critical items needing attention
        alerts = []
        if overdue_approvals > 0:
            alerts.append({
                'type': 'approval_overdue',
                'severity': 'warning',
                'count': overdue_approvals,
                'message': f'{overdue_approvals} documents pending > 48h',
                'link': '/approvals'
            })
        if overdue_tasks > 0:
            alerts.append({
                'type': 'task_overdue',
                'severity': 'critical',
                'count': overdue_tasks,
                'message': f'{overdue_tasks} tasks past deadline',
                'link': '/scheduling'
            })
        # Budget warnings - projects over 90% utilization
        over_budget = projects.filter(spent__gt=0).annotate(
            util=Count('id')  # placeholder
        )
        budget_warning_count = 0
        for p in projects:
            if p.budget and p.spent and p.spent > p.budget * 0.9:
                budget_warning_count += 1
        if budget_warning_count > 0:
            alerts.append({
                'type': 'budget_warning',
                'severity': 'warning',
                'count': budget_warning_count,
                'message': f'{budget_warning_count} projects over 90% budget',
                'link': '/projects'
            })
        
        # Top 5 projects by budget
        top_projects = []
        for p in projects.order_by('-budget')[:5]:
            utilization = (p.spent / p.budget * 100) if p.budget and p.budget > 0 else 0
            top_projects.append({
                'id': str(p.id),
                'name': p.name,
                'budget': p.budget or 0,
                'spent': p.spent or 0,
                'progress': p.progress or 0,
                'status': p.status,
                'utilization': round(utilization, 1)
            })
        
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
                'color': 'blue',
                'link': f'/projects/{project.id}'
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
                    'color': 'green',
                    'link': f'/edms?doc={doc.id}'
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
                'change': '+5.2%',
                'color': 'emerald'
            },
            {
                'id': 'active_projects',
                'label': 'Active Projects',
                'value': project_stats['in_progress'],
                'formatted': str(project_stats['in_progress']),
                'trend': 'up',
                'change': '+2',
                'color': 'blue'
            },
            {
                'id': 'pending_approvals',
                'label': 'Pending Approvals',
                'value': pending_approvals,
                'formatted': str(pending_approvals),
                'trend': 'neutral' if pending_approvals == 0 else 'down',
                'change': 'Needs attention' if pending_approvals > 0 else 'All clear',
                'color': 'amber' if pending_approvals > 0 else 'emerald'
            },
            {
                'id': 'schedule_health',
                'label': 'Schedule Health',
                'value': schedule_health['percentage'],
                'formatted': f"{schedule_health['percentage']}%",
                'trend': 'up' if schedule_health['percentage'] >= 80 else 'down',
                'change': f"{schedule_health['on_track']} on track",
                'color': 'emerald' if schedule_health['percentage'] >= 80 else 'amber'
            },
            {
                'id': 'active_contracts',
                'label': 'Active Contracts',
                'value': procurement_summary['active_contracts'],
                'formatted': str(procurement_summary['active_contracts']),
                'trend': 'up',
                'change': f"{procurement_summary['active_tenders']} tenders",
                'color': 'violet'
            }
        ]
        
        return Response({
            'project_stats': project_stats,
            'financial_summary': financial_summary,
            'pending_approvals': pending_approvals,
            'critical_risks': critical_risks,
            'overdue_tasks': overdue_tasks,
            'schedule_health': schedule_health,
            'procurement_summary': procurement_summary,
            'alerts': alerts,
            'top_projects': top_projects,
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

