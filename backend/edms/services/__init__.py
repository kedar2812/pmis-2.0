"""
EDMS Services Package

Re-exports all services for backward compatibility.
"""

# Re-export from original services module (now renamed to _base_services)
# to maintain backward compatibility with existing imports
from edms.services_base import (
    DocumentService,
    WorkflowService, 
    FolderService,
    AuditService,
)

# New directory service for auto-filing
from edms.services.directory_service import DirectoryService

__all__ = [
    'DocumentService',
    'WorkflowService',
    'FolderService',
    'AuditService',
    'DirectoryService',
]
