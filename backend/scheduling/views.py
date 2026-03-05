from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ScheduleTask
from .serializers import ScheduleTaskSerializer
from common.utils.importers import ExcelImporter, MSPImporter, P6Importer
import json
from datetime import datetime

class ScheduleTaskViewSet(viewsets.ModelViewSet):
    queryset = ScheduleTask.objects.all()
    serializer_class = ScheduleTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser) # Allow file uploads
    
    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('start_date')

    @action(detail=False, methods=['post'])
    def analyze_file(self, request):
        """
        Step 1: Analyze file and return headers (for user mapping).
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=400)
        
        filename = file_obj.name.lower()
        headers = []
        
        try:
            if filename.endswith('.xlsx'):
                headers = ExcelImporter().read_headers(file_obj)
            elif filename.endswith('.xml'): # MSP
                headers = MSPImporter().read_headers(file_obj)
            elif filename.endswith('.xer'): # P6
                headers = P6Importer().read_headers(file_obj) # Might fail if temp file needed
            else:
                return Response({'error': 'Unsupported file format (use .xlsx, .xml, .xer)'}, status=400)
            
            return Response({'headers': headers, 'filename': file_obj.name})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def import_file(self, request):
        """
        Step 2: generic import using mapping.
        
        Supports ALL ScheduleTask fields. Unmapped columns are stored in metadata JSON.
        """
        file_obj = request.FILES.get('file')
        project_id = request.data.get('project_id')
        mapping_str = request.data.get('mapping', '{}')

        if not file_obj or not project_id:
            return Response({'error': 'File and Project ID required'}, status=400)

        try:
            mapping = json.loads(mapping_str)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid mapping JSON'}, status=400)

        filename = file_obj.name.lower()
        importer = None
        
        if filename.endswith('.xlsx'):
            importer = ExcelImporter()
        elif filename.endswith('.xml'):
            importer = MSPImporter()
        elif filename.endswith('.xer'):
            importer = P6Importer()
        else:
             return Response({'error': 'Unsupported file format'}, status=400)

        try:
            created_count = 0
            updated_count = 0
            error_rows = []
            
            tasks_to_create = []
            tasks_to_update = []
            
            # All valid ScheduleTask model fields that can be imported
            VALID_TASK_FIELDS = {
                'name', 'description', 'wbs_code',
                'start_date', 'end_date',
                'actual_start_date', 'actual_end_date',
                'status', 'is_milestone', 'is_critical',
                'weight', 'budgeted_cost', 'external_id',
                'progress_method', 'computed_progress',
            }
            
            # Field aliases: map common file column names to model fields
            FIELD_ALIASES = {
                'task_name': 'name',
                'activity': 'name',
                'description': 'description',
                'wbs': 'wbs_code',
                'wbs_code': 'wbs_code',
                'outlinenumber': 'wbs_code',
                'start': 'start_date',
                'start_date': 'start_date',
                'target_start_date': 'start_date',
                'finish': 'end_date',
                'end': 'end_date',
                'end_date': 'end_date',
                'target_end_date': 'end_date',
                'act_start_date': 'actual_start_date',
                'actual_start_date': 'actual_start_date',
                'act_end_date': 'actual_end_date',
                'actual_end_date': 'actual_end_date',
                'progress': 'computed_progress',
                'percentcomplete': 'computed_progress',
                'phys_complete_pct': 'computed_progress',
                'complete': 'computed_progress',
                'uid': 'external_id',
                'task_code': 'external_id',
                'id': 'external_id',
                'code': 'external_id',
                'cost': 'budgeted_cost',
                'budget': 'budgeted_cost',
                'budgeted_cost': 'budgeted_cost',
                'weight': 'weight',
                'milestone': 'is_milestone',
                'is_milestone': 'is_milestone',
                'critical': 'is_critical',
                'is_critical': 'is_critical',
                'status': 'status',
            }
            
            def parse_date(d_str):
                """Parse date from various formats."""
                if not d_str: return None
                if isinstance(d_str, datetime): return d_str.date()
                d_str = str(d_str).strip()
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y',
                           '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
                           '%d-%b-%Y', '%d-%b-%y'):
                    try: return datetime.strptime(d_str.split('T')[0].split(' ')[0], fmt.split('T')[0].split(' ')[0]).date()
                    except: pass
                # Try ISO parse as last resort
                try: return datetime.fromisoformat(d_str.replace('Z', '+00:00')).date()
                except: pass
                return None
            
            def parse_bool(val):
                """Parse boolean from various representations."""
                if isinstance(val, bool): return val
                if val is None: return False
                s = str(val).strip().lower()
                return s in ('true', '1', 'yes', 'y')
            
            def parse_float(val, default=0.0):
                """Parse float safely."""
                if val is None: return default
                try: return float(val)
                except: return default
            
            row_num = 0
            for row in importer.import_data(file_obj, mapping):
                row_num += 1
                try:
                    # Normalize row keys using aliases
                    normalized = {}
                    extra_data = {}
                    
                    for raw_key, value in row.items():
                        if value is None or str(value).strip() == '':
                            continue
                        
                        # Check if user explicitly mapped this column to a DB field
                        db_field = None
                        if mapping:
                            # Reverse lookup: find which db_field maps to this file header
                            for mapped_db, mapped_file_header in mapping.items():
                                if mapped_file_header == raw_key:
                                    # Resolve the mapped_db through aliases
                                    resolved = FIELD_ALIASES.get(mapped_db.lower(), mapped_db)
                                    if resolved in VALID_TASK_FIELDS:
                                        db_field = resolved
                                    break
                        
                        if not db_field:
                            # Try auto-resolve via aliases
                            key_lower = raw_key.lower().strip()
                            db_field = FIELD_ALIASES.get(key_lower)
                        
                        if db_field and db_field in VALID_TASK_FIELDS:
                            normalized[db_field] = value
                        else:
                            extra_data[raw_key] = str(value) if value else None
                    
                    # Extract required fields
                    name = normalized.get('name')
                    if not name:
                        continue  # Skip rows without a name
                    
                    # Build task data
                    task_data = {
                        'project_id': project_id,
                        'name': str(name)[:255],
                        'start_date': parse_date(normalized.get('start_date')) or datetime.today().date(),
                        'end_date': parse_date(normalized.get('end_date')) or datetime.today().date(),
                        'metadata': {**extra_data, '_raw': row},  # Store ALL raw data
                    }
                    
                    # Optional fields
                    if 'description' in normalized:
                        task_data['description'] = str(normalized['description'])
                    if 'wbs_code' in normalized:
                        task_data['wbs_code'] = str(normalized['wbs_code'])[:50]
                    if 'external_id' in normalized:
                        task_data['external_id'] = str(normalized['external_id'])[:255]
                    if 'computed_progress' in normalized:
                        task_data['computed_progress'] = min(parse_float(normalized['computed_progress']), 100.0)
                    if 'actual_start_date' in normalized:
                        d = parse_date(normalized['actual_start_date'])
                        if d: task_data['actual_start_date'] = d
                    if 'actual_end_date' in normalized:
                        d = parse_date(normalized['actual_end_date'])
                        if d: task_data['actual_end_date'] = d
                    if 'budgeted_cost' in normalized:
                        task_data['budgeted_cost'] = parse_float(normalized['budgeted_cost'])
                    if 'weight' in normalized:
                        task_data['weight'] = parse_float(normalized['weight'])
                    if 'is_milestone' in normalized:
                        task_data['is_milestone'] = parse_bool(normalized['is_milestone'])
                    if 'is_critical' in normalized:
                        task_data['is_critical'] = parse_bool(normalized['is_critical'])
                    if 'status' in normalized:
                        status_val = str(normalized['status']).upper().strip()
                        valid = [c[0] for c in ScheduleTask.TaskStatus.choices]
                        if status_val in valid:
                            task_data['status'] = status_val
                    if 'progress_method' in normalized:
                        method_val = str(normalized['progress_method']).upper().strip()
                        valid = [c[0] for c in ScheduleTask.ProgressMethod.choices]
                        if method_val in valid:
                            task_data['progress_method'] = method_val
                    
                    # Upsert by external_id
                    ext_id = task_data.get('external_id')
                    task = None
                    if ext_id:
                        task = ScheduleTask.objects.filter(project_id=project_id, external_id=ext_id).first()
                    
                    if task:
                        for k, v in task_data.items():
                            setattr(task, k, v)
                        tasks_to_update.append(task)
                    else:
                        tasks_to_create.append(ScheduleTask(**task_data))
                        
                except Exception as row_err:
                    error_rows.append({'row': row_num, 'error': str(row_err)})
                    if len(error_rows) > 50:
                        break  # Don't accumulate too many errors
            
            # Bulk operations
            if tasks_to_create:
                ScheduleTask.objects.bulk_create(tasks_to_create)
                created_count = len(tasks_to_create)
            
            if tasks_to_update:
                for task in tasks_to_update:
                    task.save()
                updated_count = len(tasks_to_update)

            result = {
                'status': 'success',
                'created': created_count,
                'updated': updated_count,
            }
            if error_rows:
                result['errors'] = error_rows
                result['error_count'] = len(error_rows)
            
            # ==========================================================
            # EDMS Auto-Filing: Store the schedule file as a versioned
            # document in the project's EDMS folder structure.
            # ==========================================================
            try:
                edms_result = self._file_to_edms(
                    file_obj=file_obj,
                    project_id=project_id,
                    user=request.user,
                    created_count=created_count,
                    updated_count=updated_count,
                )
                if edms_result:
                    result['edms'] = edms_result
            except Exception as edms_err:
                # EDMS filing is non-blocking — import still succeeds
                import logging
                logging.getLogger(__name__).warning(
                    f"EDMS auto-filing failed for schedule import: {edms_err}"
                )
                result['edms_warning'] = str(edms_err)
            
            return Response(result)

        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=500)

    def _file_to_edms(self, file_obj, project_id, user, created_count=0, updated_count=0):
        """
        File an imported schedule into the EDMS with full version control.
        
        Logic:
        - First import of a filename → creates new Document + Version 1 (SCHEDULE_BASELINE)
        - Re-import of same filename → creates new Version N (SCHEDULE_UPDATE)
        - All versions are immutable with SHA-256 integrity hashes
        - Audit trail is created automatically
        
        Returns dict with document_id, version_number, folder_path for the frontend.
        """
        import hashlib
        from projects.models import Project
        from edms.models import Document, DocumentVersion, DocumentAuditLog
        from edms.services.directory_service import DirectoryService
        
        project = Project.objects.get(id=project_id)
        filename = file_obj.name
        file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        
        # Determine file type label
        type_labels = {
            'xer': 'Primavera P6',
            'xml': 'MS Project',
            'xlsx': 'Excel',
        }
        type_label = type_labels.get(file_ext, 'Schedule')
        
        # Check if this specific file was imported before for this project
        existing_doc = Document.objects.filter(
            project=project,
            metadata__schedule_source_filename=filename,
            metadata__is_schedule_import=True,
        ).first()
        
        # Compute SHA-256 hash
        file_obj.seek(0)
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        file_hash = sha256.hexdigest()
        file_obj.seek(0)  # Reset for storage
        
        # Determine MIME type
        mime_types = {
            'xer': 'application/octet-stream',
            'xml': 'application/xml',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        mime_type = mime_types.get(file_ext, 'application/octet-stream')
        
        if existing_doc:
            # === RE-IMPORT: Create new version of existing document ===
            route_category = 'SCHEDULE_UPDATE'
            
            last_version = existing_doc.versions.order_by('-version_number').first()
            new_version_num = (last_version.version_number + 1) if last_version else 1
            
            # Check for duplicate hash (exact same file re-uploaded)
            if last_version and last_version.file_hash == file_hash:
                return {
                    'document_id': str(existing_doc.id),
                    'version_number': last_version.version_number,
                    'is_duplicate': True,
                    'message': 'File is identical to the latest version — no new version created.',
                }
            
            version = DocumentVersion(
                document=existing_doc,
                version_number=new_version_num,
                file=file_obj,
                file_name=filename,
                file_size=file_obj.size,
                file_hash=file_hash,
                mime_type=mime_type,
                uploaded_by=user,
                change_notes=f"Schedule re-import ({type_label}): {created_count} created, {updated_count} updated tasks",
            )
            version.save()  # This auto-updates document.current_version
            
            # Update document metadata
            import_history = existing_doc.metadata.get('import_history', [])
            import_history.append({
                'version': new_version_num,
                'timestamp': datetime.now().isoformat(),
                'created': created_count,
                'updated': updated_count,
                'file_hash': file_hash[:16],
            })
            existing_doc.metadata['import_history'] = import_history
            existing_doc.metadata['last_import'] = datetime.now().isoformat()
            existing_doc.save(update_fields=['metadata', 'updated_at'])
            
            doc = existing_doc
            
        else:
            # === FIRST IMPORT: Create new Document + Version 1 ===
            route_category = 'SCHEDULE_BASELINE'
            
            # Get the target EDMS folder
            folder = DirectoryService.get_route_folder(project, route_category, created_by=user)
            
            doc = Document(
                title=f"Schedule Import — {filename}",
                description=f"{type_label} schedule file for project {project.name}. "
                           f"Initial import: {created_count} tasks created.",
                document_type=Document.DocumentType.REPORT,
                project=project,
                folder=folder,
                status=Document.Status.DRAFT,
                uploaded_by=user,
                tags=['schedule', 'import', file_ext, type_label.lower()],
                metadata={
                    'is_schedule_import': True,
                    'schedule_source_filename': filename,
                    'schedule_format': file_ext,
                    'schedule_type': type_label,
                    'import_history': [{
                        'version': 1,
                        'timestamp': datetime.now().isoformat(),
                        'created': created_count,
                        'updated': updated_count,
                        'file_hash': file_hash[:16],
                    }],
                    'last_import': datetime.now().isoformat(),
                },
            )
            doc.save()
            
            version = DocumentVersion(
                document=doc,
                version_number=1,
                file=file_obj,
                file_name=filename,
                file_size=file_obj.size,
                file_hash=file_hash,
                mime_type=mime_type,
                uploaded_by=user,
                change_notes=f"Initial schedule import ({type_label}): {created_count} tasks created",
            )
            version.save()
        
        # Audit log
        try:
            DocumentAuditLog.objects.create(
                actor=user,
                actor_role=getattr(user, 'role', ''),
                action=DocumentAuditLog.Action.UPLOAD,
                resource_type='Document',
                resource_id=doc.id,
                details={
                    'trigger': 'schedule_import',
                    'filename': filename,
                    'format': file_ext,
                    'version': version.version_number,
                    'tasks_created': created_count,
                    'tasks_updated': updated_count,
                    'file_hash': file_hash[:16],
                },
            )
        except Exception:
            pass  # Non-blocking
        
        return {
            'document_id': str(doc.id),
            'document_title': doc.title,
            'version_number': version.version_number,
            'folder_path': doc.folder.get_full_path() if doc.folder else None,
            'is_duplicate': False,
        }




