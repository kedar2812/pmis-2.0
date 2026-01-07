"""
Global Search Service - Smart Category Detection with Fuzzy Matching

Features:
- Smart category detection: "documents" shows all documents
- Fuzzy matching for typos: "documens" still finds documents
- Case-insensitive matching
- Word-based search for regular queries
- Searches all major PMIS entities
"""

from django.db.models import Q
from projects.models import Project
from users.models import User
from edms.models import Document, Folder
from finance.models import RABill, BOQItem
from procurement.models import Tender, Contract
from masters.models import Contractor
from scheduling.models import ScheduleTask
from communications.models import Thread


# Fuzzy matching helper - calculates similarity between two strings
def fuzzy_match(s1, s2, threshold=0.7):
    """Simple fuzzy matching using character overlap ratio"""
    s1, s2 = s1.lower(), s2.lower()
    if s1 == s2:
        return True
    if not s1 or not s2:
        return False
    
    # Check if one contains the other
    if s1 in s2 or s2 in s1:
        return True
    
    # Calculate character overlap
    set1, set2 = set(s1), set(s2)
    overlap = len(set1 & set2)
    max_len = max(len(set1), len(set2))
    
    # Also check edit distance approximation
    if abs(len(s1) - len(s2)) <= 2:
        matching_chars = sum(1 for c1, c2 in zip(s1, s2) if c1 == c2)
        similarity = matching_chars / max(len(s1), len(s2))
        if similarity >= threshold:
            return True
    
    return overlap / max_len >= threshold


class GlobalSearchService:
    """
    Unified search service with smart category detection
    """
    
    # Category keywords - maps search terms to categories
    # Includes common variations and potential typos
    CATEGORY_KEYWORDS = {
        'projects': ['project', 'projects', 'proj', 'prject', 'porject'],
        'documents': ['document', 'documents', 'doc', 'docs', 'documnt', 'documens', 'edms', 'files', 'file'],
        'folders': ['folder', 'folders', 'foldr', 'directory', 'directories'],
        'users': ['user', 'users', 'usr', 'usrs', 'people', 'person', 'staff', 'employee', 'employees'],
        'bills': ['bill', 'bills', 'ra bill', 'ra-bill', 'rabill', 'billing', 'invoice', 'invoices', 'payment', 'payments'],
        'boq_items': ['boq', 'boqs', 'boq item', 'boq items', 'quantity', 'quantities', 'bill of quantity'],
        'tenders': ['tender', 'tenders', 'tendr', 'bid', 'bids', 'procurement', 'eprocurement', 'e-procurement'],
        'contracts': ['contract', 'contracts', 'contrct', 'agreement', 'agreements'],
        'contractors': ['contractor', 'contractors', 'vendor', 'vendors', 'supplier', 'suppliers', 'builder', 'builders'],
        'tasks': ['task', 'tasks', 'tsk', 'schedule', 'schedules', 'scheduling', 'milestone', 'milestones', 'activity', 'activities'],
        'threads': ['thread', 'threads', 'communication', 'communications', 'message', 'messages', 'chat', 'chats', 'discussion'],
    }
    
    # Search categories configuration
    CATEGORIES = {
        'projects': {
            'model': Project,
            'fields': ['name', 'description', 'category', 'status'],
            'title_field': 'name',
            'subtitle_field': 'description',
            'icon': 'FolderOpen',
            'route': '/projects',
            'detail_route': '/projects/{id}',
            'display_name': 'Projects',
        },
        'documents': {
            'model': Document,
            'fields': ['title', 'description', 'document_number'],
            'title_field': 'title',
            'subtitle_field': 'document_number',
            'icon': 'FileText',
            'route': '/edms',
            'detail_route': '/edms?doc={id}',
            'display_name': 'Documents',
        },
        'folders': {
            'model': Folder,
            'fields': ['name'],
            'title_field': 'name',
            'subtitle_field': 'name',
            'icon': 'Folder',
            'route': '/edms',
            'detail_route': '/edms?folder={id}',
            'display_name': 'Folders',
        },
        'users': {
            'model': User,
            'fields': ['first_name', 'last_name', 'email', 'role'],
            'title_field': 'full_name',
            'subtitle_field': 'email',
            'icon': 'User',
            'route': '/admin/users',
            'detail_route': '/admin/users?user={id}',
            'display_name': 'Users',
        },
        'bills': {
            'model': RABill,
            'fields': ['bill_no', 'work_order_no'],
            'title_field': 'bill_no',
            'subtitle_field': 'work_order_no',
            'icon': 'IndianRupee',
            'route': '/cost/ra-billing',
            'detail_route': '/cost/ra-billing?bill={id}',
            'display_name': 'RA Bills',
        },
        'boq_items': {
            'model': BOQItem,
            'fields': ['description', 'item_code', 'uom'],
            'title_field': 'description',
            'subtitle_field': 'item_code',
            'icon': 'ListOrdered',
            'route': '/cost/boq',
            'detail_route': '/cost/boq?item={id}',
            'display_name': 'BOQ Items',
        },
        'tenders': {
            'model': Tender,
            'fields': ['title', 'tender_no', 'description'],
            'title_field': 'title',
            'subtitle_field': 'tender_no',
            'icon': 'Gavel',
            'route': '/e-procurement',
            'detail_route': '/e-procurement?tender={id}',
            'display_name': 'Tenders',
        },
        'contracts': {
            'model': Contract,
            'fields': ['contract_no'],
            'title_field': 'contract_no',
            'subtitle_field': 'contract_no',
            'icon': 'FileSignature',
            'route': '/e-procurement',
            'detail_route': '/e-procurement?contract={id}',
            'display_name': 'Contracts',
        },
        'contractors': {
            'model': Contractor,
            'fields': ['name', 'email', 'gstin', 'pan', 'contact_person'],
            'title_field': 'name',
            'subtitle_field': 'email',
            'icon': 'Building2',
            'route': '/admin/master-data',
            'detail_route': '/admin/master-data?contractor={id}',
            'display_name': 'Contractors',
        },
        'tasks': {
            'model': ScheduleTask,
            'fields': ['name'],
            'title_field': 'name',
            'subtitle_field': 'name',
            'icon': 'CheckSquare',
            'route': '/scheduling',
            'detail_route': '/scheduling?task={id}',
            'display_name': 'Schedule Tasks',
        },
        'threads': {
            'model': Thread,
            'fields': ['subject'],
            'title_field': 'subject',
            'subtitle_field': 'subject',
            'icon': 'MessageSquare',
            'route': '/communications',
            'detail_route': '/communications/thread/{id}',
            'display_name': 'Communications',
        },
    }
    
    def __init__(self, user, query, categories=None, limit=5):
        """Initialize search service"""
        self.user = user
        self.query = query.strip()
        self.query_lower = self.query.lower()
        self.requested_categories = categories
        self.limit = min(limit, 20)  # Allow more results for category browsing
        self.query_words = [w.strip().lower() for w in self.query.split() if w.strip()]
        
        # Detect if query matches a category keyword
        self.detected_category = self._detect_category()
        
    def _detect_category(self):
        """Detect if the query matches a category/module name"""
        query = self.query_lower
        
        # First, try exact/keyword matching
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if query == keyword or query == keyword + 's':
                    return category
                # Check if query starts with keyword
                if query.startswith(keyword):
                    return category
        
        # Then, try fuzzy matching for typos
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if len(query) >= 3 and fuzzy_match(query, keyword, threshold=0.75):
                    return category
        
        return None
        
    def search(self):
        """Execute global search - smart category detection or regular search"""
        if not self.query or len(self.query) < 2:
            return {
                'query': self.query,
                'total_results': 0,
                'categories': {},
                'detected_category': None,
            }
        
        # If a category was detected, return all items from that category
        if self.detected_category:
            return self._get_category_results(self.detected_category)
        
        # Otherwise, do normal word-based search
        return self._search_all_categories()
    
    def _get_category_results(self, category_key):
        """Get all results from a specific category (for category keywords)"""
        if category_key not in self.CATEGORIES:
            return self._search_all_categories()
        
        config = self.CATEGORIES[category_key]
        model = config['model']
        
        try:
            queryset = self._get_queryset_for_category(category_key, model)
            results = queryset.all()[:self.limit]
            
            serialized = [
                self._serialize_result(obj, config, category_key)
                for obj in results
            ]
            
            total_count = queryset.count()
            
            return {
                'query': self.query,
                'total_results': len(serialized),
                'detected_category': category_key,
                'category_display_name': config.get('display_name', category_key.title()),
                'categories': {
                    category_key: {
                        'count': len(serialized),
                        'total': total_count,
                        'results': serialized,
                        'icon': config['icon'],
                        'route': config['route'],
                    }
                }
            }
        except Exception as e:
            print(f"Category search error: {e}")
            return self._search_all_categories()
    
    def _search_all_categories(self):
        """Search across all categories with word-based matching"""
        categories = self.requested_categories or list(self.CATEGORIES.keys())
        
        results = {}
        total_count = 0
        
        for category_key in categories:
            if category_key not in self.CATEGORIES:
                continue
                
            category_config = self.CATEGORIES[category_key]
            category_results = self._search_category(category_key, category_config)
            
            if category_results:
                results[category_key] = {
                    'count': len(category_results),
                    'total': len(category_results),
                    'results': category_results,
                    'icon': category_config['icon'],
                    'route': category_config['route'],
                }
                total_count += len(category_results)
        
        return {
            'query': self.query,
            'total_results': total_count,
            'detected_category': None,
            'categories': results
        }
    
    def _search_category(self, category_key, config):
        """Search within a category using word-based matching"""
        model = config['model']
        fields = config['fields']
        
        try:
            queryset = self._get_queryset_for_category(category_key, model)
            
            # Build filter: match if any word matches any field
            combined_filter = Q()
            
            for word in self.query_words:
                word_filter = Q()
                for field in fields:
                    try:
                        word_filter |= Q(**{f"{field}__icontains": word})
                    except Exception:
                        continue
                combined_filter |= word_filter
            
            # Also match full query
            full_query_filter = Q()
            for field in fields:
                try:
                    full_query_filter |= Q(**{f"{field}__icontains": self.query})
                except Exception:
                    continue
            
            final_filter = combined_filter | full_query_filter
            results = queryset.filter(final_filter).distinct()[:self.limit]
            
            return [
                self._serialize_result(obj, config, category_key)
                for obj in results
            ]
            
        except Exception as e:
            print(f"Search error in {category_key}: {e}")
            return []
    
    def _get_queryset_for_category(self, category_key, model):
        """Get filtered queryset based on user permissions"""
        queryset = model.objects.all()
        
        if category_key == 'users':
            if not self.user.is_staff:
                queryset = queryset.filter(id=self.user.id)
        
        return queryset
    
    def _serialize_result(self, obj, config, category_key):
        """Serialize search result to JSON"""
        title_field = config['title_field']
        if title_field == 'full_name' and category_key == 'users':
            title = f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip()
            if not title:
                title = getattr(obj, 'email', 'Unknown User')
        else:
            title = getattr(obj, title_field, 'Untitled')
        
        subtitle_field = config['subtitle_field']
        subtitle = getattr(obj, subtitle_field, '')
        
        detail_route = config['detail_route'].format(id=obj.id)
        metadata = self._get_metadata(obj, category_key)
        
        return {
            'id': str(obj.id),
            'title': str(title)[:100] if title else 'Untitled',
            'subtitle': str(subtitle)[:100] if subtitle else None,
            'category': category_key,
            'icon': config['icon'],
            'route': detail_route,
            'metadata': metadata,
        }
    
    def _get_metadata(self, obj, category_key):
        """Get category-specific metadata"""
        metadata = {}
        
        try:
            if category_key == 'projects':
                metadata['status'] = getattr(obj, 'status', None)
                metadata['progress'] = getattr(obj, 'progress', 0)
            elif category_key == 'bills':
                net = getattr(obj, 'net_payable', 0)
                metadata['amount'] = float(net) if net else 0
                metadata['status'] = getattr(obj, 'status', None)
            elif category_key == 'tasks':
                metadata['status'] = getattr(obj, 'status', None)
                metadata['progress'] = getattr(obj, 'progress', 0)
            elif category_key == 'documents':
                metadata['status'] = getattr(obj, 'status', None)
            elif category_key == 'tenders':
                metadata['status'] = getattr(obj, 'status', None)
            elif category_key == 'contracts':
                metadata['status'] = getattr(obj, 'status', None)
        except Exception:
            pass
        
        return metadata
