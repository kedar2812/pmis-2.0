"""
EDMS Structure Alignment Command

Retroactively applies the standard folder structure to existing projects.
This is safe to run multiple times (idempotent) and will only create missing folders.

Usage:
    python manage.py align_edms_structure              # All projects
    python manage.py align_edms_structure --dry-run    # Preview only
    python manage.py align_edms_structure --project-id=123  # Specific project
"""
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Ensure all existing projects have the standard EDMS folder structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            help='Specific project ID to align (default: all projects)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without creating folders',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of projects to process per batch (default: 100)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each project',
        )

    def handle(self, *args, **options):
        from projects.models import Project
        from edms.services.directory_service import DirectoryService
        
        dry_run = options['dry_run']
        project_id = options['project_id']
        batch_size = options['batch_size']
        verbose = options['verbose']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
            self.stdout.write('')
        
        # Get projects to process
        if project_id:
            try:
                projects = [Project.objects.get(id=project_id)]
                self.stdout.write(f'Processing single project: {projects[0].name}')
            except Project.DoesNotExist:
                raise CommandError(f'Project with ID {project_id} not found')
        else:
            projects = list(Project.objects.all().order_by('id'))
            self.stdout.write(f'Processing {len(projects)} projects...')
        
        # Statistics
        total_projects = len(projects)
        processed = 0
        skipped = 0
        total_folders_created = 0
        errors = []
        
        # Process in batches for memory efficiency
        for i in range(0, total_projects, batch_size):
            batch = projects[i:i + batch_size]
            
            for project in batch:
                try:
                    if dry_run:
                        # Preview mode: check what would be created
                        validation = DirectoryService.validate_project_structure(project)
                        
                        if validation['is_valid']:
                            skipped += 1
                            if verbose:
                                self.stdout.write(
                                    f'  [SKIP] {project.name}: Structure already complete'
                                )
                        else:
                            missing_count = validation['missing_count']
                            total_folders_created += missing_count
                            self.stdout.write(
                                f'  [WOULD CREATE] {project.name}: '
                                f'{missing_count} folders missing'
                            )
                            if verbose:
                                for folder in validation['missing_folders'][:5]:
                                    self.stdout.write(f'    - {folder}')
                                if missing_count > 5:
                                    self.stdout.write(f'    ... and {missing_count - 5} more')
                    else:
                        # Actual mode: create folders
                        with transaction.atomic():
                            folders_created = DirectoryService.ensure_project_structure(
                                project=project,
                                created_by=None  # System-initiated
                            )
                            
                            if folders_created > 0:
                                total_folders_created += folders_created
                                self.stdout.write(
                                    f'  [OK] {project.name}: '
                                    f'{folders_created} folders created'
                                )
                            else:
                                skipped += 1
                                if verbose:
                                    self.stdout.write(
                                        f'  [SKIP] {project.name}: '
                                        'Structure already complete'
                                    )
                    
                    processed += 1
                    
                except Exception as e:
                    errors.append((project.name, str(e)))
                    self.stdout.write(
                        self.style.ERROR(f'  [ERROR] {project.name}: {e}')
                    )
                    logger.exception(f'Error processing project {project.name}')
            
            # Progress update for large batches
            if total_projects > batch_size:
                progress = min(i + batch_size, total_projects)
                self.stdout.write(
                    f'Progress: {progress}/{total_projects} projects processed'
                )
        
        # Summary
        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write('SUMMARY')
        self.stdout.write('=' * 60)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes were made'))
            self.stdout.write(f'Projects analyzed: {processed}')
            self.stdout.write(f'Projects already complete: {skipped}')
            self.stdout.write(f'Folders that would be created: {total_folders_created}')
        else:
            self.stdout.write(self.style.SUCCESS(f'Projects processed: {processed}'))
            self.stdout.write(f'Projects skipped (already complete): {skipped}')
            self.stdout.write(self.style.SUCCESS(
                f'Total folders created: {total_folders_created}'
            ))
        
        if errors:
            self.stdout.write(self.style.ERROR(f'Errors: {len(errors)}'))
            for project_name, error in errors:
                self.stdout.write(self.style.ERROR(f'  - {project_name}: {error}'))
        
        self.stdout.write('')
        
        if dry_run and total_folders_created > 0:
            self.stdout.write(
                self.style.NOTICE(
                    'Run without --dry-run to apply changes:'
                )
            )
            self.stdout.write('  python manage.py align_edms_structure')
