"""
Global Search API Views

RESTful endpoints for global search functionality
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from pmis.services.searchService import GlobalSearchService


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    Global search endpoint across all PMIS entities
    
    Query Parameters:
        q (str, required): Search query (minimum 2 characters)
        categories (str, optional): Comma-separated list of categories to search
        limit (int, optional): Maximum results per category (default: 5, max: 10)
    
    Returns:
        {
            "query": "search term",
            "total_results": 42,
            "categories": {
                "projects": {
                    "count": 5,
                    "total": 12,
                    "results": [...],
                    "icon": "FolderOpen",
                    "route": "/projects"
                },
                ...
            }
        }
    
    Example:
        GET /api/search/global/?q=highway&categories=projects,documents&limit=10
    """
    # Validate query parameter
    query = request.GET.get('q', '').strip()
    
    if not query:
        return Response(
            {'error': 'Query parameter "q" is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(query) < 2:
        return Response(
            {'error': 'Query must be at least 2 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse optional parameters
    categories_param = request.GET.get('categories', None)
    categories = categories_param.split(',') if categories_param else None
    
    try:
        limit = int(request.GET.get('limit', 5))
    except ValueError:
        limit = 5
    
    # Execute search
    try:
        search_service = GlobalSearchService(
            user=request.user,
            query=query,
            categories=categories,
            limit=limit
        )
        
        results = search_service.search()
        
        return Response(results, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Search failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    """
    Get search suggestions based on partial query
    
    Query Parameters:
        q (str, required): Partial search query
        limit (int, optional): Maximum suggestions (default: 5)
    
    Returns:
        {
            "suggestions": ["highway project", "railway station", ...]
        }
    """
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response({'suggestions': []})
    
    # TODO: Implement autocomplete logic
    # For now, return empty suggestions
    # Future: Use PostgreSQL prefix search or dedicated autocomplete service
    
    return Response({'suggestions': []})
