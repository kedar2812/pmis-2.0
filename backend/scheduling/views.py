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
            # Process Rows
            created_count = 0
            updated_count = 0
            
            for row in importer.import_data(file_obj, mapping):
                # Standardize Fields based on mapping or internal schema
                # For Excel, mapping keys should match our internal codes if possible, or we handle here
                # Expected keys in 'row' (after mapping applied by importer):
                # 'name', 'start_date', 'end_date', 'progress', 'external_id'
                
                # If explicit mapping was passed (Excel), row keys are DB fields.
                # If no mapping (MSP/P6), row keys are standard Importer keys.
                
                # Normalization
                name = row.get('name') or row.get('Name') or row.get('task_name')
                ext_id = row.get('external_id') or row.get('UID') or row.get('task_code')
                start = row.get('start_date') or row.get('Start') or row.get('target_start_date')
                end = row.get('end_date') or row.get('Finish') or row.get('target_end_date')
                progress = row.get('progress') or row.get('PercentComplete') or row.get('phys_complete_pct') or 0
                
                if not name: continue
                
                # Date Parsing (Very crude, needs robustness)
                def parse_date(d_str):
                    if not d_str: return None
                    if isinstance(d_str, datetime): return d_str.date()
                    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%Y-%m-%dT%H:%M:%S'):
                         try: return datetime.strptime(str(d_str).split('T')[0], '%Y-%m-%d').date()
                         except: pass
                    return None # Fallback

                # Update or Create
                task_data = {
                    'project_id': project_id,
                    'name': name,
                    'start_date': parse_date(start) or datetime.today(),
                    'end_date': parse_date(end) or datetime.today(),
                    'progress': float(progress or 0),
                    'external_id': ext_id,
                    'metadata': row # Dump all raw data into metadata
                }
                
                # Try to find existing by External ID if present
                task = None
                if ext_id:
                    task = ScheduleTask.objects.filter(project_id=project_id, external_id=ext_id).first()
                
                if task:
                    for k, v in task_data.items():
                        setattr(task, k, v)
                    task.save()
                    updated_count += 1
                else:
                    ScheduleTask.objects.create(**task_data)
                    created_count += 1

            return Response({
                'status': 'success',
                'created': created_count,
                'updated': updated_count
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)
