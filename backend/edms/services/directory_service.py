"""
EDMS Directory Service - Automated Intelligent Filing System

Provides:
- Standardized government-compliant folder structure for projects
- Smart document routing based on category
- Idempotent operations (safe to run multiple times)

Industry Standard: Uses numbered prefixes for proper lifecycle ordering.
"""
import logging
from typing import Optional, Dict, List, Tuple
from django.db import transaction
from django.core.cache import cache

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION: Standard Government Project Structure
# =============================================================================

STANDARD_PROJECT_STRUCTURE: Dict[str, List[str]] = {
    "01_Planning & Approvals": [
        "Admin Approvals",
        "DPR",
        "Feasibility Reports",
        "Site Survey",
        "Environmental Clearance",
    ],
    "02_Procurement & Contracts": [
        "Tenders",
        "Agreements",
        "Work Orders",
        "LOA",
        "Tender Evaluation",
    ],
    "03_Engineering & Design": [
        "Drawings",
        "BoQ",
        "Technical Specs",
        "As-Built Drawings",
        "Revisions",
    ],
    "04_Financials": [
        "RA Bills",
        "Tax Invoices",
        "Payment Advices",
        "Budget Estimates",
        "Final Bills",
        "Fund Sanction Orders",  # Funding proof documents from project creation
    ],
    "05_Site Execution": [
        "Daily Reports",
        "Site Photos",
        "Inspection Reports",
        "Risk Evidence",
        "Quality Reports",
        "Safety Reports",
    ],
    "06_Legal & Compliance": [
        "Insurance",
        "Bank Guarantees",
        "Notices",
        "NOCs",
        "Licenses",
    ],
    "07_Correspondence": [
        "Incoming",
        "Outgoing",
        "Meeting Minutes",
    ],
    "99_Miscellaneous": [
        "Uncategorized",
        "Archives",
    ],
}


# =============================================================================
# CONFIGURATION: Smart Routing Category Mappings
# =============================================================================

ROUTE_CATEGORY_MAPPING: Dict[str, str] = {
    # Planning & Approvals
    "ADMIN_APPROVAL": "01_Planning & Approvals/Admin Approvals",
    "DPR": "01_Planning & Approvals/DPR",
    "FEASIBILITY": "01_Planning & Approvals/Feasibility Reports",
    "SITE_SURVEY": "01_Planning & Approvals/Site Survey",
    "ENV_CLEARANCE": "01_Planning & Approvals/Environmental Clearance",
    
    # Procurement & Contracts
    "TENDER": "02_Procurement & Contracts/Tenders",
    "AGREEMENT": "02_Procurement & Contracts/Agreements",
    "WORK_ORDER": "02_Procurement & Contracts/Work Orders",
    "LOA": "02_Procurement & Contracts/LOA",
    "TENDER_EVALUATION": "02_Procurement & Contracts/Tender Evaluation",
    
    # Engineering & Design
    "DRAWING": "03_Engineering & Design/Drawings",
    "BOQ": "03_Engineering & Design/BoQ",
    "TECH_SPEC": "03_Engineering & Design/Technical Specs",
    "AS_BUILT": "03_Engineering & Design/As-Built Drawings",
    
    # Financials
    "RA_BILL": "04_Financials/RA Bills",
    "INVOICE": "04_Financials/Tax Invoices",
    "PAYMENT_ADVICE": "04_Financials/Payment Advices",
    "BUDGET": "04_Financials/Budget Estimates",
    "FINAL_BILL": "04_Financials/Final Bills",
    "FUNDING_PROOF": "04_Financials/Fund Sanction Orders",  # For two-step upload from project creation
    
    # Site Execution
    "DAILY_REPORT": "05_Site Execution/Daily Reports",
    "SITE_PHOTO": "05_Site Execution/Site Photos",
    "INSPECTION": "05_Site Execution/Inspection Reports",
    "RISK_EVIDENCE": "05_Site Execution/Risk Evidence",
    "QUALITY_REPORT": "05_Site Execution/Quality Reports",
    "SAFETY_REPORT": "05_Site Execution/Safety Reports",
    
    # Legal & Compliance
    "INSURANCE": "06_Legal & Compliance/Insurance",
    "BANK_GUARANTEE": "06_Legal & Compliance/Bank Guarantees",
    "NOTICE": "06_Legal & Compliance/Notices",
    "NOC": "06_Legal & Compliance/NOCs",
    "LICENSE": "06_Legal & Compliance/Licenses",
    
    # Correspondence
    "CORRESPONDENCE_IN": "07_Correspondence/Incoming",
    "CORRESPONDENCE_OUT": "07_Correspondence/Outgoing",
    "MEETING_MINUTES": "07_Correspondence/Meeting Minutes",
    
    # Fallback
    "OTHER": "99_Miscellaneous/Uncategorized",
}


# All valid route categories for serializer choices
ROUTE_CATEGORY_CHOICES: List[Tuple[str, str]] = [
    ("ADMIN_APPROVAL", "Admin Approval"),
    ("DPR", "Detailed Project Report"),
    ("FEASIBILITY", "Feasibility Report"),
    ("SITE_SURVEY", "Site Survey"),
    ("ENV_CLEARANCE", "Environmental Clearance"),
    ("TENDER", "Tender Document"),
    ("AGREEMENT", "Agreement/Contract"),
    ("WORK_ORDER", "Work Order"),
    ("LOA", "Letter of Award"),
    ("TENDER_EVALUATION", "Tender Evaluation"),
    ("DRAWING", "Drawing"),
    ("BOQ", "Bill of Quantities"),
    ("TECH_SPEC", "Technical Specification"),
    ("AS_BUILT", "As-Built Drawing"),
    ("RA_BILL", "Running Account Bill"),
    ("INVOICE", "Tax Invoice"),
    ("PAYMENT_ADVICE", "Payment Advice"),
    ("BUDGET", "Budget Estimate"),
    ("FINAL_BILL", "Final Bill"),
    ("FUNDING_PROOF", "Fund Sanction Order"),
    ("DAILY_REPORT", "Daily Progress Report"),
    ("SITE_PHOTO", "Site Photograph"),
    ("INSPECTION", "Inspection Report"),
    ("RISK_EVIDENCE", "Risk Evidence"),
    ("QUALITY_REPORT", "Quality Report"),
    ("SAFETY_REPORT", "Safety Report"),
    ("INSURANCE", "Insurance Document"),
    ("BANK_GUARANTEE", "Bank Guarantee"),
    ("NOTICE", "Notice"),
    ("NOC", "No Objection Certificate"),
    ("LICENSE", "License/Permit"),
    ("CORRESPONDENCE_IN", "Incoming Correspondence"),
    ("CORRESPONDENCE_OUT", "Outgoing Correspondence"),
    ("MEETING_MINUTES", "Meeting Minutes"),
    ("OTHER", "Other/Miscellaneous"),
]


class DirectoryService:
    """
    Service for managing standardized EDMS folder structures.
    
    Features:
    - Idempotent operations (safe to run multiple times)
    - Transaction-safe folder creation
    - Smart routing based on document category
    - Caching for high-traffic scenarios
    
    Usage:
        DirectoryService.ensure_project_structure(project, created_by=user)
        folder = DirectoryService.get_route_folder(project, "RA_BILL", user)
    """
    
    # Cache timeout for folder lookups (5 minutes)
    CACHE_TIMEOUT = 300
    
    @classmethod
    @transaction.atomic
    def ensure_project_structure(cls, project, created_by=None) -> int:
        """
        Ensure a project has the complete standard folder structure.
        
        This is IDEMPOTENT: safe to call multiple times without creating duplicates.
        Uses get_or_create for each folder to prevent race conditions.
        
        Args:
            project: Project instance
            created_by: User who triggered creation (for audit trail)
            
        Returns:
            int: Number of folders created (0 if structure already existed)
        """
        from edms.models import Folder, DocumentAuditLog
        
        folders_created = 0
        project_id = str(project.id)
        
        logger.info(f"Ensuring folder structure for project: {project.name} ({project_id})")
        
        try:
            # Create parent folders and their subfolders
            for parent_name, subfolders in STANDARD_PROJECT_STRUCTURE.items():
                # Create parent folder
                parent_folder, parent_created = Folder.objects.get_or_create(
                    project=project,
                    name=parent_name,
                    parent=None,
                    defaults={'created_by': created_by}
                )
                
                if parent_created:
                    folders_created += 1
                    cls._log_folder_creation(
                        parent_folder, created_by, 
                        auto_created=True, 
                        trigger='project_structure_init'
                    )
                
                # Create subfolders
                for subfolder_name in subfolders:
                    subfolder, sub_created = Folder.objects.get_or_create(
                        project=project,
                        name=subfolder_name,
                        parent=parent_folder,
                        defaults={'created_by': created_by}
                    )
                    
                    if sub_created:
                        folders_created += 1
                        cls._log_folder_creation(
                            subfolder, created_by,
                            auto_created=True,
                            trigger='project_structure_init'
                        )
            
            # Invalidate cache for this project
            cls._invalidate_project_cache(project_id)
            
            logger.info(
                f"Folder structure complete for {project.name}: "
                f"{folders_created} new folders created"
            )
            
        except Exception as e:
            logger.error(f"Error creating folder structure for {project.name}: {e}")
            raise
        
        return folders_created
    
    @classmethod
    def get_route_folder(cls, project, route_category: str, created_by=None):
        """
        Get the target folder for a given route category.
        
        If the folder doesn't exist (rare edge case), creates it immediately.
        
        Args:
            project: Project instance
            route_category: Category key from ROUTE_CATEGORY_MAPPING
            created_by: User for audit trail
            
        Returns:
            Folder instance
            
        Raises:
            ValueError: If route_category is invalid
        """
        from edms.models import Folder
        
        # Validate category
        if route_category not in ROUTE_CATEGORY_MAPPING:
            logger.warning(f"Unknown route category: {route_category}, using fallback")
            route_category = "OTHER"
        
        path = ROUTE_CATEGORY_MAPPING[route_category]
        
        # Try cache first
        cache_key = f"edms_folder_{project.id}_{route_category}"
        cached_folder_id = cache.get(cache_key)
        
        if cached_folder_id:
            try:
                return Folder.objects.get(id=cached_folder_id)
            except Folder.DoesNotExist:
                # Cache is stale, continue to lookup
                cache.delete(cache_key)
        
        # Lookup by path
        folder = cls.get_folder_by_path(project, path, created_by)
        
        # Cache the result
        if folder:
            cache.set(cache_key, str(folder.id), cls.CACHE_TIMEOUT)
        
        return folder
    
    @classmethod
    @transaction.atomic
    def get_folder_by_path(cls, project, path: str, created_by=None):
        """
        Get a folder by its path (e.g., "04_Financials/RA Bills").
        
        Creates the folder hierarchy if it doesn't exist.
        
        Args:
            project: Project instance
            path: Folder path (e.g., "01_Planning & Approvals/Admin Approvals")
            created_by: User for audit trail
            
        Returns:
            Folder instance
        """
        from edms.models import Folder
        
        parts = path.split("/")
        current_parent = None
        current_folder = None
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
                
            current_folder, created = Folder.objects.get_or_create(
                project=project,
                name=part,
                parent=current_parent,
                defaults={'created_by': created_by}
            )
            
            if created:
                cls._log_folder_creation(
                    current_folder, created_by,
                    auto_created=True,
                    trigger='route_folder_creation'
                )
                logger.info(f"Created folder on-demand: {path}")
            
            current_parent = current_folder
        
        return current_folder
    
    @classmethod
    def get_project_folder_tree(cls, project) -> Dict:
        """
        Get the complete folder tree for a project.
        
        Optimized for large projects with many folders.
        Uses prefetch to minimize database queries.
        
        Args:
            project: Project instance
            
        Returns:
            dict: Nested folder structure
        """
        from edms.models import Folder
        
        # Single query with prefetch for efficiency
        all_folders = list(
            Folder.objects.filter(project=project)
            .select_related('parent', 'created_by')
            .order_by('name')
        )
        
        # Build tree in memory
        folder_map = {str(f.id): f for f in all_folders}
        root_folders = []
        
        for folder in all_folders:
            if folder.parent is None:
                root_folders.append(cls._folder_to_dict(folder, folder_map, all_folders))
        
        return {
            'project_id': str(project.id),
            'project_name': project.name,
            'folders': root_folders,
            'total_count': len(all_folders)
        }
    
    @classmethod
    def get_folder_statistics(cls, project) -> Dict:
        """
        Get statistics about folder structure for a project.
        
        Args:
            project: Project instance
            
        Returns:
            dict: Statistics including folder count, document count per folder
        """
        from edms.models import Folder, Document
        from django.db.models import Count
        
        folders_with_counts = (
            Folder.objects.filter(project=project)
            .annotate(document_count=Count('documents'))
            .values('id', 'name', 'parent_id', 'document_count')
        )
        
        total_folders = len(folders_with_counts)
        empty_folders = sum(1 for f in folders_with_counts if f['document_count'] == 0)
        total_documents = sum(f['document_count'] for f in folders_with_counts)
        
        return {
            'total_folders': total_folders,
            'empty_folders': empty_folders,
            'folders_with_docs': total_folders - empty_folders,
            'total_documents': total_documents,
            'expected_folders': cls._get_expected_folder_count(),
            'structure_complete': total_folders >= cls._get_expected_folder_count()
        }
    
    @classmethod
    def validate_project_structure(cls, project) -> Dict:
        """
        Validate if a project has the complete standard structure.
        
        Args:
            project: Project instance
            
        Returns:
            dict: Validation result with missing folders
        """
        from edms.models import Folder
        
        existing_folders = set(
            Folder.objects.filter(project=project)
            .values_list('name', 'parent__name')
        )
        
        missing = []
        
        for parent_name, subfolders in STANDARD_PROJECT_STRUCTURE.items():
            # Check parent exists
            if (parent_name, None) not in existing_folders:
                missing.append(parent_name)
            
            # Check subfolders exist
            for subfolder_name in subfolders:
                if (subfolder_name, parent_name) not in existing_folders:
                    missing.append(f"{parent_name}/{subfolder_name}")
        
        return {
            'is_valid': len(missing) == 0,
            'missing_folders': missing,
            'missing_count': len(missing)
        }
    
    # =========================================================================
    # Private Helper Methods
    # =========================================================================
    
    @staticmethod
    def _log_folder_creation(folder, created_by, auto_created=False, trigger='manual'):
        """Log folder creation to audit trail."""
        from edms.models import DocumentAuditLog
        
        try:
            DocumentAuditLog.objects.create(
                actor=created_by,
                actor_role=getattr(created_by, 'role', '') if created_by else '',
                action=DocumentAuditLog.Action.FOLDER_CREATED,
                resource_type='Folder',
                resource_id=folder.id,
                details={
                    'folder_name': folder.name,
                    'project_id': str(folder.project_id),
                    'parent_id': str(folder.parent_id) if folder.parent_id else None,
                    'auto_created': auto_created,
                    'trigger': trigger
                }
            )
        except Exception as e:
            # Don't fail folder creation if audit log fails
            logger.warning(f"Failed to create audit log for folder {folder.name}: {e}")
    
    @staticmethod
    def _invalidate_project_cache(project_id: str):
        """Invalidate all cached folder lookups for a project."""
        # In a more sophisticated setup, use cache versioning or tags
        # For now, we rely on cache timeout
        pass
    
    @staticmethod
    def _get_expected_folder_count() -> int:
        """Calculate total expected folders from structure definition."""
        count = 0
        for parent, subfolders in STANDARD_PROJECT_STRUCTURE.items():
            count += 1 + len(subfolders)
        return count
    
    @classmethod
    def _folder_to_dict(cls, folder, folder_map, all_folders) -> Dict:
        """Convert folder to dict with children."""
        children = [
            cls._folder_to_dict(f, folder_map, all_folders)
            for f in all_folders
            if f.parent_id == folder.id
        ]
        
        return {
            'id': str(folder.id),
            'name': folder.name,
            'path': folder.get_full_path(),
            'children': children,
            'document_count': folder.documents.count() if hasattr(folder, 'documents') else 0
        }
