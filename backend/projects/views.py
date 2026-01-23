from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Project, WorkPackage, FundingSource
from .serializers import ProjectSerializer, WorkPackageSerializer

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Project creation request data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Project creation validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"Project creation exception: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def eligible_staff(self, request, pk=None):
        """
        Get staff eligible for package assignment based on project hierarchy.
        
        Returns users who are:
        - In the same division, subdivision, or zone as the project
        - Have appropriate roles (not contractors or consultants)
        - Active accounts
        
        This ensures package responsible staff are from the project's hierarchy.
        """
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        project = self.get_object()
        
        # Build hierarchy filter
        hierarchy_filter = Q()
        
        # Filter by division first (most specific)
        if project.division:
            hierarchy_filter |= Q(division=project.division)
        
        # Filter by subdivision if available
        if project.sub_division:
            hierarchy_filter |= Q(subdivision=project.sub_division)
        
        # Filter by zone (broader)
        if project.zone:
            hierarchy_filter |= Q(zone=project.zone)
        
        # Fallback: if no hierarchy set, return all active staff
        if not (project.division or project.sub_division or project.zone):
            hierarchy_filter = Q(account_status='ACTIVE')
        
        # Get users matching hierarchy
        staff = User.objects.filter(hierarchy_filter).filter(
            account_status='ACTIVE'
        ).exclude(
            role__in=['EPC_Contractor', 'Consultant', 'Guest']  # Exclude non-staff roles
        ).select_related('division', 'subdivision', 'zone').order_by('first_name', 'last_name')[:100]
        
        # Serialize user data
        staff_data = [{
           'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'full_name': user.get_full_name() if hasattr(user, 'get_full_name') else f"{user.first_name} {user.last_name}",
            'role': user.role,
            'role_display': getattr(user, 'get_role_display', lambda: user.role)(),
            'division': user.division.name if user.division else None,
        } for user in staff]
        
        return Response({
            'count': len(staff_data),
            'eligible_staff': staff_data,
            'filter_applied': {
                'division': project.division.name if project.division else None,
                'subdivision': project.sub_division.name if project.sub_division else None,
                'zone': project.zone.name if project.zone else None,
            }
        })


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
        try:
            return self._get_stats(request)
        except Exception as e:
            import traceback
            print(f"Dashboard stats error: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': str(e),
                'project_stats': {'total': 0, 'in_progress': 0, 'planning': 0, 'completed': 0, 'on_hold': 0},
                'financial_summary': {'total_budget': 0, 'total_spent': 0, 'remaining': 0, 'utilization': 0},
                'pending_approvals': 0,
                'critical_risks': 0,
                'overdue_tasks': 0,
                'schedule_health': {'on_track': 0, 'delayed': 0, 'critical': 0, 'percentage': 100},
                'procurement_summary': {'active_tenders': 0, 'open_bids': 0, 'active_contracts': 0, 'pending_variations': 0},
                'alerts': [{'type': 'error', 'severity': 'critical', 'message': f'Dashboard error: {str(e)}', 'link': '/'}],
                'top_projects': [],
                'kpis': [],
                'recent_activity': [],
                'milestones': [],
                'critical_path_tasks': [],
                'risk_summary': {'high': 0, 'medium': 0, 'low': 0, 'total': 0, 'top_risks': []},
                'change_requests': [],
                'earned_value': {'cpi': 1.0, 'spi': 1.0, 'status': 'unknown'},
                'cash_flow': [],
            }, status=status.HTTP_200_OK)

    def _get_stats(self, request):
        user = request.user
        today = timezone.now().date()
        
        # Get projects data
        projects = Project.objects.all()
        active_projects = projects.filter(status='In Progress')
        
        # Project counts by status
        project_stats = {
            'total': projects.count(),
            'in_progress': active_projects.count(),
            'planning': projects.filter(status='Planning').count(),
            'completed': projects.filter(status='Completed').count(),
            'on_hold': projects.filter(status='On Hold').count(),
        }
        
        # ========== AGGREGATED PROGRESS (from computed fields) ==========
        # Physical Progress: Weighted average by budget across active projects
        progress_aggregates = active_projects.aggregate(
            total_budget=Sum('budget'),
            total_earned_value=Sum('earned_value'),
            avg_physical_progress=Avg('physical_progress'),
            avg_financial_progress=Avg('financial_progress'),
            avg_schedule_variance=Avg('schedule_variance'),
        )
        
        portfolio_physical_progress = float(progress_aggregates['avg_physical_progress'] or 0)
        portfolio_financial_progress = float(progress_aggregates['avg_financial_progress'] or 0)
        portfolio_earned_value = float(progress_aggregates['total_earned_value'] or 0)
        portfolio_schedule_variance = float(progress_aggregates['avg_schedule_variance'] or 0)
        
        # Progress state summary
        progress_state_counts = {
            'claimed': active_projects.filter(progress_state='CLAIMED').count(),
            'verified': active_projects.filter(progress_state='VERIFIED').count(),
            'flagged': active_projects.filter(progress_state='FLAGGED').count(),
        }
        
        # Financial summary
        financial_summary = projects.aggregate(
            total_budget=Sum('budget'),
            total_spent=Sum('spent'),
        )
        financial_summary['total_budget'] = float(financial_summary['total_budget'] or 0)
        financial_summary['total_spent'] = float(financial_summary['total_spent'] or 0)
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
        except ImportError:
            logger.warning("EDMS module not available for dashboard stats")
        except Exception as e:
            logger.error(f"Failed to fetch EDMS approval data: {e}")
        
        # Get critical risks count
        critical_risks = 0
        try:
            critical_risks = projects.filter(
                Q(status='In Progress') & Q(progress__lt=50)
            ).count()
        except Exception as e:
            logger.error(f"Failed to calculate critical risks: {e}")
        
        # Schedule health from scheduling module
        schedule_health = {
            'on_track': 0,
            'delayed': 0,
            'critical': 0,
            'percentage': 0,
            'no_data': True  # Flag to indicate no scheduling data available
        }
        overdue_tasks = 0
        try:
            from scheduling.models import ScheduleTask
            all_tasks = ScheduleTask.objects.all()
            total_tasks = all_tasks.count()
            
            if total_tasks > 0:
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
                    'percentage': round((on_track / total_tasks * 100), 1),
                    'no_data': False
                }
        except ImportError:
            logger.warning("Scheduling module not available for dashboard stats")
        except Exception as e:
            logger.error(f"Failed to fetch scheduling data: {e}")
        
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
            if p.budget and p.spent and float(p.spent) > float(p.budget) * 0.9:
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
            utilization = (float(p.spent) / float(p.budget) * 100) if p.budget and p.budget > 0 else 0
            top_projects.append({
                'id': str(p.id),
                'name': p.name,
                'budget': float(p.budget) if p.budget else 0,
                'spent': float(p.spent) if p.spent else 0,
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
        
        # Milestones from scheduling (next 5 upcoming)
        milestones = []
        try:
            from scheduling.models import ScheduleTask
            milestone_tasks = ScheduleTask.objects.filter(
                is_milestone=True,
                end_date__gte=today
            ).order_by('end_date')[:5]
            
            for m in milestone_tasks:
                milestones.append({
                    'id': str(m.id),
                    'name': m.name,
                    'project': m.project.name if m.project else 'N/A',
                    'date': m.end_date.isoformat() if m.end_date else None,
                    'status': m.status
                })
        except Exception:
            # Fallback: create milestones from project end dates
            for p in projects.filter(status='In Progress').order_by('end_date')[:5]:
                if p.end_date:
                    milestones.append({
                        'id': str(p.id),
                        'name': f'{p.name} - Completion',
                        'project': p.name,
                        'date': p.end_date.isoformat() if hasattr(p.end_date, 'isoformat') else str(p.end_date),
                        'status': 'PLANNED'
                    })
        
        # Critical path tasks (overdue or starting soon)
        critical_path_tasks = []
        try:
            from scheduling.models import ScheduleTask
            critical_tasks = ScheduleTask.objects.filter(
                Q(is_critical=True) | Q(end_date__lt=today, status__in=['PLANNED', 'IN_PROGRESS'])
            ).order_by('end_date')[:5]
            
            for t in critical_tasks:
                critical_path_tasks.append({
                    'id': str(t.id),
                    'name': t.name,
                    'project': t.project.name if t.project else 'N/A',
                    'end_date': t.end_date.isoformat() if t.end_date else None,
                    'status': t.status,
                    'is_overdue': t.end_date < today if t.end_date else False
                })
        except Exception:
            pass
        
        # Risk summary - NOW USING REAL RISK DATA
        risk_summary = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'total': 0,
            'overdue': 0,
            'top_risks': []
        }
        try:
            from projects.risk_models import Risk
            active_risks = Risk.objects.filter(is_active=True).exclude(status='CLOSED')
            risk_summary = {
                'critical': active_risks.filter(severity='CRITICAL').count(),
                'high': active_risks.filter(severity='HIGH').count(),
                'medium': active_risks.filter(severity='MEDIUM').count(),
                'low': active_risks.filter(severity='LOW').count(),
                'total': active_risks.count(),
                'overdue': active_risks.filter(
                    target_resolution__lt=today
                ).exclude(status__in=['CLOSED', 'MITIGATED']).count(),
                'top_risks': list(
                    active_risks.filter(severity__in=['CRITICAL', 'HIGH'])
                    .select_related('project', 'owner')
                    .values('id', 'risk_code', 'title', 'severity', 'status', 'project__name')[:5]
                )
            }
            # Update critical_risks count
            critical_risks = risk_summary['critical'] + risk_summary['high']
        except Exception as e:
            logger.warning(f"Failed to fetch risk data: {e}")
            # Estimate from project progress as fallback
            risk_summary = {
                'critical': 0,
                'high': projects.filter(progress__lt=30, status='In Progress').count(),
                'medium': projects.filter(progress__gte=30, progress__lt=60, status='In Progress').count(),
                'low': projects.filter(progress__gte=60, status='In Progress').count(),
                'total': projects.filter(status='In Progress').count(),
                'overdue': 0,
                'top_risks': []
            }
        
        # Change requests / Variations
        change_requests = []
        try:
            from procurement.models import Variation
            variations = Variation.objects.filter(status__in=['PROPOSED', 'UNDER_REVIEW']).order_by('-created_at')[:5]
            for v in variations:
                change_requests.append({
                    'id': str(v.id),
                    'title': v.description[:50] if v.description else 'Variation',
                    'type': v.variation_type,
                    'amount': float(v.amount) if v.amount else 0,
                    'status': v.status,
                    'contract': v.contract.title if v.contract else 'N/A'
                })
        except Exception:
            pass
        
        # Earned Value Metrics (EVM)
        total_budget = float(financial_summary['total_budget'] or 1)
        total_spent = float(financial_summary['total_spent'] or 0)
        avg_progress = float(projects.aggregate(avg=Avg('progress'))['avg'] or 0)
        
        # EV = Budget * Progress%
        earned_value = total_budget * (avg_progress / 100)
        # CPI = EV / AC (Cost Performance Index)
        cpi = earned_value / total_spent if total_spent > 0 else 1.0
        # SPI = EV / PV (Schedule Performance Index) - simplified
        spi = avg_progress / 50 if avg_progress > 0 else 1.0  # Assuming 50% planned progress
        
        earned_value_metrics = {
            'earned_value': round(earned_value, 2),
            'actual_cost': round(total_spent, 2),
            'cpi': round(cpi, 2),
            'spi': round(min(spi, 2.0), 2),  # Cap at 2.0
            'status': 'on_budget' if cpi >= 1.0 else 'over_budget',
            'variance': round((cpi - 1.0) * 100, 1)
        }
        
        # Cash flow (last 6 months)
        cash_flow = []
        for i in range(6):
            month_date = timezone.now() - timedelta(days=30 * (5 - i))
            month_name = month_date.strftime('%b')
            # Simulated based on total spent distribution
            inflow = (total_budget / 12) * (1 + (i * 0.1))
            outflow = (total_spent / 6) * (1 + (i * 0.05))
            cash_flow.append({
                'month': month_name,
                'inflow': round(inflow / 10000000, 2),  # In Cr
                'outflow': round(outflow / 10000000, 2),
                'net': round((inflow - outflow) / 10000000, 2)
            })
        
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
            # New data for comprehensive dashboard
            'milestones': milestones,
            'critical_path_tasks': critical_path_tasks,
            'risk_summary': risk_summary,
            'change_requests': change_requests,
            'earned_value': earned_value_metrics,
            'cash_flow': cash_flow,
            # ========== NEW: Aggregated Progress KPIs ==========
            'portfolio_progress': {
                'physical_progress': round(portfolio_physical_progress, 1),
                'financial_progress': round(portfolio_financial_progress, 1),
                'earned_value': round(portfolio_earned_value, 2),
                'schedule_variance': round(portfolio_schedule_variance, 1),
                'active_projects': project_stats['in_progress'],
            },
            'progress_state_counts': progress_state_counts,
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


class CalendarEventsView(APIView):
    """
    Calendar events aggregated from all modules.
    Returns milestones, billing events, risks, compliance deadlines, and workflows.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import datetime
        from .calendar_service import calendar_aggregator
        
        # Parse date range
        start_str = request.query_params.get('start')
        end_str = request.query_params.get('end')
        
        try:
            if start_str:
                start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00')).date()
            else:
                start_date = timezone.now().date() - timedelta(days=30)
            
            if end_str:
                end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00')).date()
            else:
                end_date = timezone.now().date() + timedelta(days=60)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse filters
        filters = {}
        event_types = request.query_params.get('event_types')
        if event_types:
            filters['event_types'] = event_types.split(',')
        
        projects = request.query_params.get('projects')
        if projects:
            filters['projects'] = projects.split(',')
        
        # Get aggregated events
        events = calendar_aggregator.get_events(
            user=request.user,
            start_date=start_date,
            end_date=end_date,
            filters=filters
        )
        
        return Response({
            'events': events,
            'count': len(events),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })

