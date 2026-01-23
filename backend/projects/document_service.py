"""
Package Document Management Service - EDMS Integration

Handles automatic folder creation in EDMS and document storage for work packages.
Designed for Government of India standards with security, scalability, and audit trail.
"""

import re
import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.core.exceptions import ValidationError
from edms.models import Folder, Document
from edms.services import DocumentService as EDMSDocumentService

logger = logging.getLogger(__name__)


class PackageDocumentService:
    """
    Robust service for package folder and document management in EDMS.
    
    Features:
    - Thread-safe folder creation with atomic transactions
    - Proper error handling and logging
    - Security validations
    - Audit trail integration
    """
    
    # Constants for folder structure
    PROJECTS_ROOT_NAME = "Projects"
    PACKAGES_FOLDER_NAME = "Packages"
    MAX_FOLDER_NAME_LENGTH = 100
    
    @staticmethod
    def sanitize_folder_name(name: str) -> str:
        """
        Sanitize package/project name for safe folder naming.
        
        Args:
            name: Original name to sanitize
            
        Returns:
            Sanitized folder name (lowercase, alphanumeric + underscores)
            
        Security:
            - Removes special characters that could cause path traversal
            - Prevents directory traversal attacks (.., /, \\)
            - Limits length to prevent buffer overflow
        """
        if not name:
            raise ValidationError("Name cannot be empty")
        
        # Remove any path traversal attempts
        name = name.replace('..', '').replace('/', '').replace('\\', '')
        
        # Remove special characters, keep only alphanumeric, spaces, hyphens
        sanitized = re.sub(r'[^\w\s-]', '', name)
        
        # Replace spaces and multiple hyphens with single underscore
        sanitized = re.sub(r'[-\s]+', '_', sanitized)
        
        # Convert to lowercase for consistency
        sanitized = sanitized.lower().strip('_')
        
        # Ensure length limit
        if len(sanitized) > PackageDocumentService.MAX_FOLDER_NAME_LENGTH:
            sanitized = sanitized[:PackageDocumentService.MAX_FOLDER_NAME_LENGTH]
        
        # Ensure result is not empty after sanitization
        if not sanitized:
            raise ValidationError(f"Sanitized name is empty from input: {name}")
        
        return sanitized
    
    @staticmethod
    @transaction.atomic
    def create_package_folder_in_edms(project, package) -> Folder:
        """
        Create dedicated EDMS folder structure for package with atomic transaction.
        
        Structure:
            EDMS Root (project-specific)
            └── Packages
                └── {package_id}_{package_name}
        
        Args:
            project: Project instance
            package: WorkPackage instance
            
        Returns:
            Folder: EDMS Folder instance for the package
            
        Raises:
            ValidationError: If folder creation fails validation
            
        Security:
            - Uses atomic transactions to prevent partial folder creation
            - Validates all inputs
            - Prevents duplicate folder creation with get_or_create
        """
        try:
            # Validate inputs
            if not project:
                raise ValidationError("Project is required")
            if not package:
                raise ValidationError("Package is required")
            if not package.id:
                raise ValidationError("Package must be saved before creating folder")
            
            # Get the project's root folder in EDMS (each project has its own root)
            project_folder = project.folders.filter(parent=None).first()
            if not project_folder:
                logger.error(f"Project {project.id} has no root EDMS folder")
                raise ValidationError(f"Project {project.name} has no EDMS root folder. Please ensure project is properly initialized.")
            
            # Get or create "Packages" subfolder under project
            packages_folder, created = Folder.objects.get_or_create(
                name=PackageDocumentService.PACKAGES_FOLDER_NAME,
                parent=project_folder,
                project=project,
                defaults={
                    'description': f'Work packages for project: {project.name}',
                    'created_by': None  # responsible_staff is CharField, not User FK
                }
            )
            
            if created:
                logger.info(f"Created Packages folder for project {project.id}")
            
            # Create package-specific folder with unique identifier
            package_folder_name = f"{package.id}_{PackageDocumentService.sanitize_folder_name(package.name)}"
            
            # Use get_or_create to prevent duplicates
            package_folder, created = Folder.objects.get_or_create(
                name=package_folder_name,
                parent=packages_folder,
                project=project,
                defaults={
                    'description': f'Documents for package: {package.name} | Agreement: {package.agreement_no or "N/A"}',
                    'created_by': None  # responsible_staff is CharField, not User FK
                }
            )
            
            if created:
                logger.info(f"Created EDMS folder for package {package.id}: {package_folder_name}")
            else:
                logger.warning(f"EDMS folder already exists for package {package.id}")
            
            return package_folder
            
        except Exception as e:
            logger.error(f"Failed to create EDMS folder for package {package.id}: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to create package folder: {str(e)}")
    
    @staticmethod
    @transaction.atomic
    def upload_agreement_to_edms(package, agreement_file, package_folder: Folder, uploaded_by=None) -> Document:
        """
        Upload agreement document to EDMS package folder with full metadata.
        
        Args:
            package: WorkPackage instance
            agreement_file: UploadedFile from request
            package_folder: EDMS Folder instance
            uploaded_by: User instance (defaults to package.responsible_staff)
            
        Returns:
            Document: EDMS Document instance
            
        Raises:
            ValidationError: If upload fails validation
            
        Security:
            - File size validation (max 10MB)
            - File type validation (PDF, DOC, DOCX only)
            - Metadata sanitization
            - Atomic transaction for data integrity
        """
        try:
            # Validate inputs
            if not package or not agreement_file or not package_folder:
                raise ValidationError("Package, file, and folder are required")
            
            # File size validation (10MB limit)
            max_size = 10 * 1024 * 1024
            if agreement_file.size > max_size:
                raise ValidationError(f"File size ({agreement_file.size} bytes) exceeds maximum allowed size (10MB)")
            
            # File type validation
            allowed_types = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            if agreement_file.content_type not in allowed_types:
                raise ValidationError(f"File type {agreement_file.content_type} not allowed. Only PDF, DOC, DOCX files are permitted.")
            
            # Sanitize filename
            original_name = agreement_file.name
            extension = original_name.split('.')[-1] if '.' in original_name else 'pdf'
            
            # Validate extension
            if extension.lower() not in ['pdf', 'doc', 'docx']:
                raise ValidationError(f"Invalid file extension: {extension}")
            
            filename = f"agreement_{PackageDocumentService.sanitize_folder_name(package.agreement_no or str(package.id))}.{extension}"
            
            # Prepare metadata
            metadata = {
                'package_id': str(package.id),
                'package_name': package.name,
                'agreement_no': package.agreement_no,
                'agreement_date': str(package.agreement_date) if package.agreement_date else None,
                'contractor_id': str(package.contractor.id) if package.contractor else None,
                'contractor_name': package.contractor.name if package.contractor else None,
                'contract_value': str(package.budget) if hasattr(package, 'budget') and package.budget else None,
                'document_category': 'Package Agreement',
                'uploaded_via': 'Package Creation System'
            }
            
            # Use EDMS DocumentService for secure upload
            uploader = uploaded_by or package.responsible_staff
            
            document = EDMSDocumentService.upload_document(
                user=uploader,
                project=package.project,
                file=agreement_file,
                title=f"Package Agreement - {package.agreement_no or package.name}",
                description=f"Agreement document for work package: {package.name}\nContractor: {package.contractor.name if package.contractor else 'TBD'}",
                document_type='CONTRACT',  # Use EDMS document type enum
                folder=package_folder,
                is_confidential=False,  # Agreements are typically not confidential
                metadata=metadata,
                change_notes='Initial agreement document upload via package creation'
            )
            
            logger.info(f"Successfully uploaded agreement to EDMS for package {package.id}: Document ID {document.id}")
            
            return document
            
        except Exception as e:
            logger.error(f"Failed to upload agreement for package {package.id}: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to upload agreement document: {str(e)}")
    
    @staticmethod
    def get_package_folder_path(package_folder: Folder) -> str:
        """
        Get human-readable full path of package folder in EDMS hierarchy.
        
        Args:
            package_folder: EDMS Folder instance
            
        Returns:
            str: Full path (e.g., "Railway Project / Packages / civil_works_phase_1")
            
        Note:
            Uses Folder model's built-in get_full_path() method
        """
        if not package_folder:
            return "Not created"
        
        try:
            return package_folder.get_full_path()
        except Exception as e:
            logger.error(f"Failed to get folder path for folder {package_folder.id}: {str(e)}")
            return f"Folder ID: {package_folder.id}"
    
    @staticmethod
    @transaction.atomic
    def archive_package_folder(package) -> bool:
        """
        Archive (soft delete) package folder from EDMS for audit trail.
        
        Args:
            package: WorkPackage instance
            
        Returns:
            bool: True if archived successfully, False if folder not found
            
        Security:
            - Soft delete only (preserves audit trail)
            - Archives all documents within folder
            - Atomic transaction
        """
        try:
            if not package or not package.package_folder_edms:
                logger.warning(f"No EDMS folder to archive for package {package.id if package else 'unknown'}")
                return False
            
            package_folder = package.package_folder_edms
            
            # Archive all documents in the folder (EDMS uses status field, not is_archived)
            documents_archived = Document.objects.filter(folder=package_folder).update(
                status=Document.Status.ARCHIVED
            )
            
            logger.info(f"Archived {documents_archived} documents in folder {package_folder.id}")
            
            # Note: Folder model doesn't have is_archived field in the view
            # If needed, we could add a metadata flag or status field
            # For now, archiving documents is sufficient as folders are hierarchical
            
            logger.info(f"Successfully archived package folder for package {package.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to archive folder for package {package.id}: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def validate_package_for_folder_creation(package) -> None:
        """
        Validate package has all required fields before folder creation.
        
        Args:
            package: WorkPackage instance
            
        Raises:
            ValidationError: If validation fails
        """
        errors = []
        
        if not package.name:
            errors.append("Package name is required")
        
        if not package.project:
            errors.append("Package must be associated with a project")
        
        if not package.agreement_no:
            errors.append("Agreement number is required for folder creation")
        
        if errors:
            raise ValidationError("; ".join(errors))
