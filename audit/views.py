"""
Unified Audit Log Views - Aggregates logs from all system modules
Provides a single endpoint for viewing all system activities
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edms.models import DocumentAuditLog
from django.db.models import Q


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unified_audit_logs(request):
    """
    Aggregate audit logs from all modules.
    Returns unified format with IP addresses, sorted by timestamp.
    
    Query Parameters:
    - limit: Number of logs to return (default: 100)
    - search: Search term for filtering
    - module: Filter by module (EDMS, Users, Projects, etc.)
    """
    limit = int(request.GET.get('limit', 100))
    search = request.GET.get('search', '').lower()
    module_filter = request.GET.get('module', '')
    
    logs = []
    
    # 1. EDMS Document Management Logs
    if not module_filter or module_filter == 'EDMS':
        edms_query = DocumentAuditLog.objects.select_related('actor').all()
        
        # Apply search filter
        if search:
            edms_query = edms_query.filter(
                Q(actor__username__icontains=search) |
                Q(action__icontains=search) |
                Q(resource_type__icontains=search) |
                Q(details__icontains=search)
            )
        
        edms_logs = edms_query[:limit]
        
        for log in edms_logs:
            logs.append({
                'id': str(log.id),
                'timestamp': log.timestamp.isoformat(),
                'actor_name': log.actor.username if log.actor else 'System',
                'actor_role': log.actor_role,
                'action': log.action,
                'resource_type': log.resource_type,
                'module': 'EDMS',
                'details': log.details,
                'ip_address': log.ip_address or '-',  # Ensure IP is included
                'user_agent': log.user_agent[:100] if log.user_agent else ''  # Truncate user agent
            })
    
    # 2. Future: User Management Logs
    # TODO: Add user audit logs (login, logout, registration, role changes)
    
    # 3. Future: Project Management Logs
    # TODO: Add project audit logs (creation, updates, work packages)
    
    # 4. Future: Communications Logs
    # TODO: Add communication audit logs (messages, notifications)
    
    # Sort all logs by timestamp (most recent first)
    logs.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Apply limit across all modules
    logs = logs[:limit]
    
    return Response({
        'results': logs,
        'count': len(logs),
        'modules_available': ['EDMS'],  # Will expand as more modules add audit logging
        'total_modules': 1
    })
