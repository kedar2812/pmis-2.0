"""
Universal Spotlight Search — Backend Aggregator

Single endpoint that queries across 7 Django models, normalizes the results
into a unified JSON payload, and returns them sorted by category priority.

Each category is capped at 5 results to keep the response lean and fast.
"""

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# ── Model Imports (safe with try/except so the app never crashes) ──────────

try:
    from projects.models import Project
except ImportError:
    Project = None

try:
    from finance.models import RABill
except ImportError:
    RABill = None

try:
    from communications.models import Thread
except ImportError:
    Thread = None

try:
    from edms.models import Document
except ImportError:
    Document = None

try:
    from masters.models.entities import Contractor
except ImportError:
    Contractor = None

try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None

try:
    from scheduling.models import ScheduleTask
except ImportError:
    ScheduleTask = None


# ── Per-model search functions ─────────────────────────────────────────────
# Each function returns a list of normalized dicts.
# All queries use icontains for case-insensitive partial matching.

MAX_PER_CATEGORY = 5


def _search_projects(query):
    """Search projects by name."""
    if not Project:
        return []
    qs = Project.objects.filter(Q(name__icontains=query))[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'proj_{p.id}',
            'type': 'Project',
            'title': p.name,
            'subtitle': f'{p.status}',
            'url': f'/projects/{p.id}',
        }
        for p in qs
    ]


def _search_bills(query):
    """Search RA Bills by bill_no or work_order_no."""
    if not RABill:
        return []
    qs = RABill.objects.filter(
        Q(bill_no__icontains=query) | Q(work_order_no__icontains=query)
    ).select_related('project')[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'bill_{b.id}',
            'type': 'RA Bill',
            'title': f'RA Bill #{b.bill_no}',
            'subtitle': f'{b.status} · ₹{b.net_payable}',
            'url': f'/cost/billing',
        }
        for b in qs
    ]


def _search_threads(query):
    """Search communication threads by subject."""
    if not Thread:
        return []
    qs = Thread.objects.filter(Q(subject__icontains=query))[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'thread_{t.id}',
            'type': 'Thread',
            'title': t.subject,
            'subtitle': f'{t.get_thread_type_display()} · {t.get_status_display()}',
            'url': f'/communications/{t.id}',
        }
        for t in qs
    ]


def _search_documents(query):
    """Search EDMS documents by title."""
    if not Document:
        return []
    qs = Document.objects.filter(Q(title__icontains=query)).select_related('project')[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'doc_{d.id}',
            'type': 'Document',
            'title': d.title,
            'subtitle': f'{d.get_document_type_display()} · {d.get_status_display()}',
            'url': f'/edms/view/{d.id}',
        }
        for d in qs
    ]


def _search_contractors(query):
    """Search contractors by name, PAN, or code."""
    if not Contractor:
        return []
    qs = Contractor.objects.filter(
        Q(name__icontains=query) | Q(pan__icontains=query) | Q(code__icontains=query)
    )[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'contr_{c.id}',
            'type': 'Contractor',
            'title': c.name,
            'subtitle': f'{c.contractor_type} · {c.code}',
            'url': '/e-procurement',
        }
        for c in qs
    ]


def _search_users(query):
    """Search users by username, email, first_name, or last_name."""
    if not User:
        return []
    qs = User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    )[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'user_{u.id}',
            'type': 'User',
            'title': u.get_full_name() or u.username,
            'subtitle': u.get_role_display() if hasattr(u, 'get_role_display') else u.role,
            'url': '/users',
        }
        for u in qs
    ]


def _search_tasks(query):
    """Search schedule tasks by name or WBS code."""
    if not ScheduleTask:
        return []
    qs = ScheduleTask.objects.filter(
        Q(name__icontains=query) | Q(wbs_code__icontains=query)
    ).select_related('project')[:MAX_PER_CATEGORY]
    return [
        {
            'id': f'task_{t.id}',
            'type': 'Task',
            'title': t.name,
            'subtitle': f'{t.get_status_display()} · WBS {t.wbs_code or "—"}',
            'url': '/scheduling',
        }
        for t in qs
    ]


# ── Main Endpoint ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    Universal search endpoint.

    GET /api/search/?q=<query>

    Returns a flat array of normalized results from all searchable modules.
    """
    query = request.query_params.get('q', '').strip()

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'query': query,
        })

    # Run all searches and concatenate — order defines category priority
    results = []
    results.extend(_search_projects(query))
    results.extend(_search_bills(query))
    results.extend(_search_threads(query))
    results.extend(_search_documents(query))
    results.extend(_search_contractors(query))
    results.extend(_search_users(query))
    results.extend(_search_tasks(query))

    return Response({
        'results': results,
        'query': query,
    })
