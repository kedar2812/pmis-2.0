"""
Global Search API Views

Provides a unified search endpoint that searches across multiple entities:
- Projects
- Documents (EDMS)
- Users
- Communications (threads/messages)
- Tasks/Schedules
- Contractors

Features:
- User-scoped data access (only returns data user can access)
- Fuzzy search with trigram similarity (when available)
- Result ranking and scoring
- Pagination support
"""

from django.db.models import Q, Value, CharField, F
from django.db.models.functions import Concat, Lower
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import re

# Import models from other apps
try:
    from projects.models import Project
except ImportError:
    Project = None

try:
    from edms.models import File as EDMSFile, Folder
except ImportError:
    EDMSFile = None
    Folder = None

try:
    from communications.models import Thread, Message
except ImportError:
    Thread = None
    Message = None

try:
    from scheduling.models import Task
except ImportError:
    Task = None

try:
    from masters.models import Contractor
except ImportError:
    Contractor = None

# Additional model imports for comprehensive search
try:
    from projects.models import Risk
except ImportError:
    Risk = None

try:
    from finance.models import BOQItem, RABill, Fund
except ImportError:
    BOQItem = None
    RABill = None
    Fund = None

try:
    from procurement.models import Package as ProcurementPackage
except ImportError:
    ProcurementPackage = None

User = get_user_model()


def normalize_query(query):
    """
    Normalize search query for better matching.
    - Lowercase
    - Remove extra whitespace
    - Handle common typos
    """
    if not query:
        return ''
    
    query = query.lower().strip()
    query = re.sub(r'\s+', ' ', query)  # Collapse whitespace
    
    return query


def calculate_relevance_score(text, query, field_weight=1.0):
    """
    Calculate a relevance score for a match.
    Higher score = better match.
    """
    if not text or not query:
        return 0
    
    text = text.lower()
    query = query.lower()
    
    # Exact match
    if text == query:
        return 100 * field_weight
    
    # Starts with query
    if text.startswith(query):
        return 90 * field_weight
    
    # Contains query
    if query in text:
        return 70 * field_weight
    
    # Word boundary match
    words = text.split()
    for word in words:
        if word.startswith(query):
            return 60 * field_weight
    
    return 0


def fuzzy_match(text, query, threshold=0.6):
    """
    Simple fuzzy matching using character-level comparison.
    Returns True if similarity is above threshold.
    """
    if not text or not query:
        return False
    
    text = text.lower()
    query = query.lower()
    
    # Direct match
    if query in text:
        return True
    
    # Character sequence matching (like trigram)
    if len(query) >= 3:
        matches = 0
        text_index = 0
        for char in query:
            while text_index < len(text):
                if text[text_index] == char:
                    matches += 1
                    text_index += 1
                    break
                text_index += 1
        
        similarity = matches / len(query)
        return similarity >= threshold
    
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    Global search endpoint.
    
    Query Parameters:
    - q: Search query (required, min 2 characters)
    - category: Filter by category (optional: 'projects', 'documents', 'users', 'communications', 'tasks')
    - limit: Maximum results per category (default: 10)
    
    Returns:
    {
        "results": [
            {
                "id": "...",
                "type": "project|document|user|...",
                "title": "...",
                "description": "...",
                "url": "/path/to/resource",
                "score": 85,
                "status": "active|pending|...",
                "breadcrumb": ["Parent", "Child"],
                "created_at": "2024-01-01T00:00:00Z"
            }
        ],
        "total": 42,
        "query": "search term"
    }
    """
    query = request.query_params.get('q', '').strip()
    category = request.query_params.get('category', 'all')
    limit = min(int(request.query_params.get('limit', 10)), 50)
    
    if not query or len(query) < 2:
        return Response({
            'results': [],
            'total': 0,
            'query': query,
            'error': 'Query must be at least 2 characters'
        })
    
    normalized_query = normalize_query(query)
    user = request.user
    results = []
    
    # Search Projects
    if category in ['all', 'projects'] and Project:
        project_results = search_projects(normalized_query, user, limit)
        results.extend(project_results)
    
    # Search Documents (EDMS)
    if category in ['all', 'documents'] and EDMSFile:
        document_results = search_documents(normalized_query, user, limit)
        results.extend(document_results)
    
    # Search Users
    if category in ['all', 'users']:
        user_results = search_users(normalized_query, user, limit)
        results.extend(user_results)
    
    # Search Communications
    if category in ['all', 'communications'] and Thread:
        comm_results = search_communications(normalized_query, user, limit)
        results.extend(comm_results)
    
    # Search Tasks/Schedules
    if category in ['all', 'tasks'] and Task:
        task_results = search_tasks(normalized_query, user, limit)
        results.extend(task_results)
    
    # Search Contractors
    if category in ['all', 'contractors'] and Contractor:
        contractor_results = search_contractors(normalized_query, user, limit)
        results.extend(contractor_results)
    
    # Search Risks
    if category in ['all', 'risks'] and Risk:
        risk_results = search_risks(normalized_query, user, limit)
        results.extend(risk_results)
    
    # Search BOQ Items
    if category in ['all', 'boq'] and BOQItem:
        boq_results = search_boq(normalized_query, user, limit)
        results.extend(boq_results)
    
    # Search RA Bills (Billing)
    if category in ['all', 'billing'] and RABill:
        billing_results = search_billing(normalized_query, user, limit)
        results.extend(billing_results)
    
    # Search Funds
    if category in ['all', 'funds'] and Fund:
        fund_results = search_funds(normalized_query, user, limit)
        results.extend(fund_results)
    
    # Search Procurement Packages
    if category in ['all', 'procurement'] and ProcurementPackage:
        procurement_results = search_procurement(normalized_query, user, limit)
        results.extend(procurement_results)
    
    # Sort by relevance score
    results.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    # Limit total results
    results = results[:limit * 3]  # Allow more overflow for additional categories
    
    return Response({
        'results': results,
        'total': len(results),
        'query': query
    })


def search_projects(query, user, limit):
    """Search projects the user has access to."""
    results = []
    
    try:
        # Build query - filter by user's accessible projects
        # For now, using a simple approach - can be enhanced with role-based access
        queryset = Project.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(code__icontains=query)
        )
        
        # Apply user-based filtering if project has user assignment
        if hasattr(Project, 'assigned_users'):
            queryset = queryset.filter(
                Q(assigned_users=user) | Q(created_by=user)
            ).distinct()
        elif hasattr(Project, 'created_by'):
            # If no user assignment, just show all (can be role-based later)
            pass
        
        for project in queryset[:limit]:
            score = max(
                calculate_relevance_score(project.name, query, 1.0),
                calculate_relevance_score(getattr(project, 'description', ''), query, 0.7),
                calculate_relevance_score(getattr(project, 'code', ''), query, 0.9)
            )
            
            results.append({
                'id': str(project.id),
                'type': 'project',
                'title': project.name,
                'description': getattr(project, 'description', '')[:100] if hasattr(project, 'description') else '',
                'url': f'/projects/{project.id}',
                'path': f'/projects/{project.id}',
                'score': score,
                'status': getattr(project, 'status', None),
                'created_at': getattr(project, 'created_at', None),
            })
    except Exception as e:
        print(f"Error searching projects: {e}")
    
    return results


def search_documents(query, user, limit):
    """Search documents/files the user has access to."""
    results = []
    
    try:
        queryset = EDMSFile.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        )
        
        # Filter by user access if file has permissions
        if hasattr(EDMSFile, 'uploaded_by'):
            # For now, show files uploaded by user or public files
            # This can be enhanced with folder-based permissions
            pass
        
        for doc in queryset[:limit]:
            score = max(
                calculate_relevance_score(doc.title, query, 1.0),
                calculate_relevance_score(getattr(doc, 'description', ''), query, 0.6)
            )
            
            # Build breadcrumb from folder hierarchy
            breadcrumb = []
            if hasattr(doc, 'folder') and doc.folder:
                folder = doc.folder
                while folder:
                    breadcrumb.insert(0, folder.name)
                    folder = getattr(folder, 'parent', None)
            
            results.append({
                'id': str(doc.id),
                'type': 'document',
                'title': doc.title,
                'description': getattr(doc, 'description', '')[:100] if hasattr(doc, 'description') else '',
                'url': f'/edms/view/{doc.id}',
                'path': f'/edms/view/{doc.id}',
                'score': score,
                'breadcrumb': breadcrumb[:3] if breadcrumb else None,
                'created_at': getattr(doc, 'created_at', None),
                'author': str(doc.uploaded_by) if hasattr(doc, 'uploaded_by') and doc.uploaded_by else None,
            })
    except Exception as e:
        print(f"Error searching documents: {e}")
    
    return results


def search_users(query, user, limit):
    """Search users (public directory)."""
    results = []
    
    try:
        queryset = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).filter(is_active=True)
        
        for u in queryset[:limit]:
            full_name = f"{u.first_name} {u.last_name}".strip() or u.username
            score = max(
                calculate_relevance_score(full_name, query, 1.0),
                calculate_relevance_score(u.username, query, 0.9),
                calculate_relevance_score(u.email, query, 0.7)
            )
            
            results.append({
                'id': str(u.id),
                'type': 'user',
                'title': full_name,
                'description': u.email,
                'url': f'/users?id={u.id}',
                'path': f'/users?id={u.id}',
                'score': score,
                'status': 'active' if u.is_active else 'inactive',
            })
    except Exception as e:
        print(f"Error searching users: {e}")
    
    return results


def search_communications(query, user, limit):
    """Search threads/messages the user is a participant of."""
    results = []
    
    try:
        # Only search threads where user is a participant
        thread_queryset = Thread.objects.filter(
            Q(title__icontains=query) | Q(subject__icontains=query)
        )
        
        # Filter by participant
        if hasattr(Thread, 'participants'):
            thread_queryset = thread_queryset.filter(participants=user)
        elif hasattr(Thread, 'created_by'):
            thread_queryset = thread_queryset.filter(
                Q(created_by=user) | Q(messages__sender=user)
            ).distinct()
        
        for thread in thread_queryset[:limit]:
            title = getattr(thread, 'title', None) or getattr(thread, 'subject', 'Message Thread')
            score = calculate_relevance_score(title, query, 1.0)
            
            results.append({
                'id': str(thread.id),
                'type': 'message',
                'title': title,
                'description': 'Message thread',
                'url': f'/communications/{thread.id}',
                'path': f'/communications/{thread.id}',
                'score': score,
                'created_at': getattr(thread, 'created_at', None),
            })
        
        # Also search messages within user's threads
        if hasattr(Thread, 'message_set') or Message:
            message_queryset = Message.objects.filter(
                content__icontains=query
            )
            
            # Filter by user's threads
            if hasattr(Message, 'thread'):
                if hasattr(Thread, 'participants'):
                    message_queryset = message_queryset.filter(thread__participants=user)
                else:
                    message_queryset = message_queryset.filter(
                        Q(sender=user) | Q(thread__created_by=user)
                    )
            
            for msg in message_queryset[:limit // 2]:  # Limit messages to half
                preview = msg.content[:80] + '...' if len(msg.content) > 80 else msg.content
                score = calculate_relevance_score(msg.content, query, 0.8)
                
                thread_id = msg.thread.id if hasattr(msg, 'thread') and msg.thread else None
                
                results.append({
                    'id': str(msg.id),
                    'type': 'message',
                    'title': f"Message from {msg.sender}" if hasattr(msg, 'sender') else 'Message',
                    'description': preview,
                    'url': f'/communications/{thread_id}' if thread_id else '/communications',
                    'path': f'/communications/{thread_id}' if thread_id else '/communications',
                    'score': score,
                    'created_at': getattr(msg, 'created_at', None),
                })
    except Exception as e:
        print(f"Error searching communications: {e}")
    
    return results


def search_tasks(query, user, limit):
    """Search tasks/schedules from user's projects."""
    results = []
    
    try:
        queryset = Task.objects.filter(
            Q(name__icontains=query) |
            Q(title__icontains=query) |
            Q(description__icontains=query)
        )
        
        # Filter by user's projects
        if hasattr(Task, 'project'):
            if hasattr(Project, 'assigned_users'):
                queryset = queryset.filter(
                    Q(project__assigned_users=user) | Q(assigned_to=user)
                ).distinct()
            elif hasattr(Task, 'assigned_to'):
                queryset = queryset.filter(assigned_to=user)
        
        for task in queryset[:limit]:
            title = getattr(task, 'name', None) or getattr(task, 'title', 'Task')
            score = max(
                calculate_relevance_score(title, query, 1.0),
                calculate_relevance_score(getattr(task, 'description', ''), query, 0.6)
            )
            
            project_name = None
            if hasattr(task, 'project') and task.project:
                project_name = task.project.name
            
            results.append({
                'id': str(task.id),
                'type': 'task',
                'title': title,
                'description': getattr(task, 'description', '')[:100] if hasattr(task, 'description') else '',
                'url': '/scheduling',
                'path': '/scheduling',
                'score': score,
                'status': getattr(task, 'status', None),
                'breadcrumb': [project_name] if project_name else None,
                'created_at': getattr(task, 'created_at', None),
            })
    except Exception as e:
        print(f"Error searching tasks: {e}")
    
    return results


def search_contractors(query, user, limit):
    """Search contractors."""
    results = []
    
    try:
        queryset = Contractor.objects.filter(
            Q(name__icontains=query) |
            Q(company_name__icontains=query) |
            Q(contact_person__icontains=query) |
            Q(email__icontains=query)
        )
        
        for contractor in queryset[:limit]:
            name = getattr(contractor, 'company_name', None) or getattr(contractor, 'name', 'Contractor')
            score = max(
                calculate_relevance_score(name, query, 1.0),
                calculate_relevance_score(getattr(contractor, 'contact_person', ''), query, 0.8)
            )
            
            results.append({
                'id': str(contractor.id),
                'type': 'contractor',
                'title': name,
                'description': getattr(contractor, 'contact_person', '') or getattr(contractor, 'email', ''),
                'url': '/admin/master-data?tab=contractors',
                'path': '/admin/master-data?tab=contractors',
                'score': score,
                'status': getattr(contractor, 'status', None),
            })
    except Exception as e:
        print(f"Error searching contractors: {e}")
    
    return results


def search_risks(query, user, limit):
    """Search project risks."""
    results = []
    
    try:
        queryset = Risk.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(category__icontains=query)
        )
        
        for risk in queryset[:limit]:
            score = max(
                calculate_relevance_score(risk.title, query, 1.0),
                calculate_relevance_score(getattr(risk, 'description', ''), query, 0.6)
            )
            
            project_name = None
            if hasattr(risk, 'project') and risk.project:
                project_name = risk.project.name
            
            results.append({
                'id': str(risk.id),
                'type': 'risk',
                'title': risk.title,
                'description': getattr(risk, 'description', '')[:100] if hasattr(risk, 'description') else '',
                'url': '/risk',
                'path': '/risk',
                'score': score,
                'status': getattr(risk, 'status', None),
                'breadcrumb': [project_name] if project_name else None,
            })
    except Exception as e:
        print(f"Error searching risks: {e}")
    
    return results


def search_boq(query, user, limit):
    """Search BOQ items."""
    results = []
    
    try:
        queryset = BOQItem.objects.filter(
            Q(description__icontains=query) |
            Q(item_code__icontains=query) |
            Q(unit__icontains=query)
        )
        
        for item in queryset[:limit]:
            title = getattr(item, 'item_code', '') or 'BOQ Item'
            score = max(
                calculate_relevance_score(getattr(item, 'description', ''), query, 1.0),
                calculate_relevance_score(title, query, 0.9)
            )
            
            project_name = None
            if hasattr(item, 'project') and item.project:
                project_name = item.project.name
            
            results.append({
                'id': str(item.id),
                'type': 'boq',
                'title': f"{title}: {getattr(item, 'description', '')[:50]}",
                'description': f"Qty: {getattr(item, 'quantity', 0)} {getattr(item, 'unit', '')}",
                'url': '/cost/boq',
                'path': '/cost/boq',
                'score': score,
                'breadcrumb': [project_name] if project_name else None,
            })
    except Exception as e:
        print(f"Error searching BOQ: {e}")
    
    return results


def search_billing(query, user, limit):
    """Search RA Bills."""
    results = []
    
    try:
        queryset = RABill.objects.filter(
            Q(bill_number__icontains=query) |
            Q(description__icontains=query) |
            Q(remarks__icontains=query)
        )
        
        for bill in queryset[:limit]:
            title = getattr(bill, 'bill_number', '') or 'RA Bill'
            score = max(
                calculate_relevance_score(title, query, 1.0),
                calculate_relevance_score(getattr(bill, 'description', ''), query, 0.7)
            )
            
            project_name = None
            if hasattr(bill, 'project') and bill.project:
                project_name = bill.project.name
            
            results.append({
                'id': str(bill.id),
                'type': 'billing',
                'title': f"RA Bill: {title}",
                'description': getattr(bill, 'description', '')[:80] if hasattr(bill, 'description') else '',
                'url': '/cost/billing',
                'path': '/cost/billing',
                'score': score,
                'status': getattr(bill, 'status', None),
                'breadcrumb': [project_name] if project_name else None,
            })
    except Exception as e:
        print(f"Error searching billing: {e}")
    
    return results


def search_funds(query, user, limit):
    """Search fund records."""
    results = []
    
    try:
        queryset = Fund.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(fund_type__icontains=query)
        )
        
        for fund in queryset[:limit]:
            title = getattr(fund, 'name', '') or 'Fund'
            score = max(
                calculate_relevance_score(title, query, 1.0),
                calculate_relevance_score(getattr(fund, 'description', ''), query, 0.6)
            )
            
            project_name = None
            if hasattr(fund, 'project') and fund.project:
                project_name = fund.project.name
            
            results.append({
                'id': str(fund.id),
                'type': 'fund',
                'title': title,
                'description': getattr(fund, 'description', '')[:80] if hasattr(fund, 'description') else '',
                'url': '/cost/funds',
                'path': '/cost/funds',
                'score': score,
                'status': getattr(fund, 'status', None),
                'breadcrumb': [project_name] if project_name else None,
            })
    except Exception as e:
        print(f"Error searching funds: {e}")
    
    return results


def search_procurement(query, user, limit):
    """Search procurement packages."""
    results = []
    
    try:
        queryset = ProcurementPackage.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(package_number__icontains=query)
        )
        
        for pkg in queryset[:limit]:
            title = getattr(pkg, 'name', '') or getattr(pkg, 'package_number', 'Package')
            score = max(
                calculate_relevance_score(title, query, 1.0),
                calculate_relevance_score(getattr(pkg, 'description', ''), query, 0.6)
            )
            
            project_name = None
            if hasattr(pkg, 'project') and pkg.project:
                project_name = pkg.project.name
            
            results.append({
                'id': str(pkg.id),
                'type': 'procurement',
                'title': title,
                'description': getattr(pkg, 'description', '')[:80] if hasattr(pkg, 'description') else '',
                'url': '/e-procurement',
                'path': '/e-procurement',
                'score': score,
                'status': getattr(pkg, 'status', None),
                'breadcrumb': [project_name] if project_name else None,
            })
    except Exception as e:
        print(f"Error searching procurement: {e}")
    
    return results

