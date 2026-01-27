"""
Workflow API Views

Provides REST endpoints for:
- Workflow templates (CRUD + admin)
- Workflow instances (view, forward, revert, reject)
- Pending approvals for users
- Delegation management
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.apps import apps

from .models import (
    WorkflowTemplate, WorkflowStep, WorkflowTriggerRule,
    WorkflowInstance, WorkflowAuditLog, DelegationRule
)
from .serializers import (
    WorkflowTemplateListSerializer, WorkflowTemplateDetailSerializer,
    WorkflowStepSerializer, WorkflowTriggerRuleSerializer,
    WorkflowInstanceListSerializer, WorkflowInstanceDetailSerializer,
    WorkflowAuditLogSerializer, DelegationRuleSerializer,
    WorkflowActionSerializer, StartWorkflowSerializer,
    WorkflowActionsResponseSerializer, PerformActionRequestSerializer,
    EntityHistoryRequestSerializer
)
from .engine import workflow_engine
from .models import WorkflowStatus


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow templates.
    
    Only admins can create/update/delete templates.
    All authenticated users can view templates.
    """
    queryset = WorkflowTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return WorkflowTemplateDetailSerializer
        return WorkflowTemplateListSerializer
    
    def get_queryset(self):
        queryset = WorkflowTemplate.objects.all()
        
        # Filter by module
        module = self.request.query_params.get('module')
        if module:
            queryset = queryset.filter(module=module)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related('created_by').prefetch_related('steps')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_step(self, request, pk=None):
        """Add a step to the template."""
        template = self.get_object()
        serializer = WorkflowStepSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(template=template)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reorder_steps(self, request, pk=None):
        """Reorder steps in the template."""
        template = self.get_object()
        step_order = request.data.get('step_order', [])  # List of step IDs in new order
        
        for idx, step_id in enumerate(step_order, start=1):
            WorkflowStep.objects.filter(id=step_id, template=template).update(sequence=idx)
        
        return Response({'success': True, 'message': 'Steps reordered'})


class WorkflowStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow steps."""
    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkflowStep.objects.select_related('template', 'role')
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        return queryset


class WorkflowTriggerRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow trigger rules."""
    queryset = WorkflowTriggerRule.objects.all()
    serializer_class = WorkflowTriggerRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkflowTriggerRule.objects.select_related('template')
        module = self.request.query_params.get('module')
        if module:
            queryset = queryset.filter(module=module)
        return queryset.order_by('module', 'priority')


class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow instances.
    
    Supports:
    - List all instances (with filters)
    - View instance details and history
    - Forward/Revert/Reject actions
    - Get pending items for current user
    """
    queryset = WorkflowInstance.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post']  # No update/delete for instances
    
    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return WorkflowInstanceDetailSerializer
        return WorkflowInstanceListSerializer
    
    def get_queryset(self):
        queryset = WorkflowInstance.objects.select_related(
            'template', 'current_step', 'current_step__role', 'started_by'
        )
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by entity type
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        # Filter by entity ID
        entity_id = self.request.query_params.get('entity_id')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending workflow items for current user."""
        try:
            instances = workflow_engine.get_pending_for_user(request.user)
            serializer = WorkflowInstanceListSerializer(instances, many=True)
            return Response({
                'count': len(serializer.data),
                'results': serializer.data
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching pending workflows: {e}")
            return Response({
                'count': 0,
                'results': [],
                'error': str(e)
            })
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new workflow for an entity."""
        serializer = StartWorkflowSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        entity_type = serializer.validated_data['entity_type']
        entity_id = serializer.validated_data['entity_id']
        module = serializer.validated_data.get('module')
        
        # Try to get the actual entity for rule evaluation
        entity = self._get_entity(entity_type, entity_id)
        if not entity:
            return Response(
                {'error': f'Entity {entity_type} with ID {entity_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        instance = workflow_engine.start_workflow(
            entity_type=entity_type,
            entity_id=str(entity_id),
            entity=entity,
            user=request.user,
            module=module
        )
        
        if instance:
            return Response(
                WorkflowInstanceDetailSerializer(instance).data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            {'error': 'No matching workflow template found'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        """Forward workflow to next step."""
        instance = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        result = workflow_engine.forward(
            instance=instance,
            user=request.user,
            remarks=serializer.validated_data.get('remarks', '')
        )
        
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        """Revert workflow to a previous step."""
        instance = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        to_step = serializer.validated_data.get('to_step')
        if not to_step:
            return Response(
                {'error': 'to_step is required for revert action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = workflow_engine.revert(
            instance=instance,
            to_step_sequence=to_step,
            user=request.user,
            remarks=serializer.validated_data.get('remarks', '')
        )
        
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject the workflow."""
        instance = self.get_object()
        serializer = WorkflowActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        result = workflow_engine.reject(
            instance=instance,
            user=request.user,
            remarks=serializer.validated_data.get('remarks', '')
        )
        
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get complete audit history for a workflow."""
        instance = self.get_object()
        history = workflow_engine.get_workflow_history(instance)
        return Response({'history': history})
    
    @action(detail=True, methods=['get'])
    def tat(self, request, pk=None):
        """Get TAT (turnaround time) statistics."""
        instance = self.get_object()
        tat_data = workflow_engine.calculate_tat(instance)
        return Response(tat_data)
    
    def _get_entity(self, entity_type: str, entity_id: str):
        """Try to get the actual entity model instance."""
        model_mapping = {
            'RABill': ('finance', 'RABill'),
            'Tender': ('procurement', 'Tender'),
            'Contract': ('procurement', 'Contract'),
            'Risk': ('projects', 'Risk'),
            'BOQItem': ('finance', 'BOQItem'),
        }
        
        if entity_type not in model_mapping:
            return None
        
        app_label, model_name = model_mapping[entity_type]
        try:
            model = apps.get_model(app_label, model_name)
            return model.objects.get(pk=entity_id)
        except Exception:
            return None


class DelegationRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing delegation rules."""
    queryset = DelegationRule.objects.all()
    serializer_class = DelegationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = DelegationRule.objects.select_related('delegator', 'delegate_to')
        
        # Users can see their own delegations
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                models.Q(delegator=self.request.user) | 
                models.Q(delegate_to=self.request.user)
            )
        
        return queryset.order_by('-valid_from')
    
    def perform_create(self, serializer):
        # Ensure user can only delegate their own authority
        if not self.request.user.is_superuser:
            serializer.save(delegator=self.request.user)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def my_delegations(self, request):
        """Get delegations given by current user."""
        delegations = DelegationRule.objects.filter(delegator=request.user)
        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def delegated_to_me(self, request):
        """Get delegations received by current user."""
        delegations = DelegationRule.objects.filter(
            delegate_to=request.user,
            is_active=True
        )
        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)


class WorkflowActionsViewSet(viewsets.ViewSet):
    """
    Unified API for workflow actions on any entity.
    
    Provides a single interface for the frontend to:
    - Check what actions are available for the current user
    - Perform workflow actions (forward, revert, reject)
    - Get workflow history for an entity
    
    All endpoints use entity_type and entity_id parameters
    rather than workflow instance IDs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # Entity type to model mapping
    ENTITY_MODEL_MAP = {
        'RABill': ('finance', 'RABill'),
        'Tender': ('procurement', 'Tender'),
        'Contract': ('procurement', 'Contract'),
        'Variation': ('procurement', 'Variation'),
        'Risk': ('projects', 'Risk'),
        'BOQItem': ('finance', 'BOQItem'),
    }
    
    def _get_entity(self, entity_type: str, entity_id: str):
        """Get the entity model instance."""
        if entity_type not in self.ENTITY_MODEL_MAP:
            return None
        
        app_label, model_name = self.ENTITY_MODEL_MAP[entity_type]
        try:
            model = apps.get_model(app_label, model_name)
            return model.objects.get(pk=entity_id)
        except Exception:
            return None
    
    def _get_active_workflow(self, entity_type: str, entity_id: str):
        """Get the active workflow instance for an entity."""
        return WorkflowInstance.objects.filter(
            entity_type=entity_type,
            entity_id=str(entity_id),
            status__in=[WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVERTED]
        ).select_related('template', 'current_step').first()
    
    @action(detail=False, methods=['get'], url_path='actions')
    def get_actions(self, request):
        """
        Check what workflow actions the current user can perform on an entity.
        
        Query Params:
            entity_type: Model name (e.g., 'RABill', 'Tender')
            entity_id: Primary key of the document
            
        Returns:
            WorkflowActionsResponseSerializer data
        """
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get active workflow for this entity
            instance = self._get_active_workflow(entity_type, entity_id)
            
            if not instance:
                # No active workflow
                return Response({
                    'has_workflow': False,
                    'can_approve': False,
                    'can_revert': False,
                    'can_reject': False,
                    'current_step_label': None,
                    'current_step_sequence': None,
                    'required_role': None,
                    'workflow_status': None,
                    'workflow_id': None,
                    'remarks_required': False
                })
            
            # Check if user can act on this workflow
            can_act = workflow_engine._can_user_act(instance, request.user)
            current_step = instance.current_step
            
            return Response({
                'has_workflow': True,
                'can_approve': can_act,
                'can_revert': can_act and (current_step.can_revert if current_step else False),
                'can_reject': can_act,
                'current_step_label': str(current_step) if current_step else 'Completed',
                'current_step_sequence': current_step.sequence if current_step else None,
                'required_role': current_step.get_role_display() if current_step else None,
                'workflow_status': instance.status,
                'workflow_id': str(instance.id),
                'remarks_required': current_step.remarks_required if current_step else False
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting workflow actions: {e}")
            return Response(
                {'error': 'Failed to check workflow actions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='perform-action')
    def perform_action(self, request):
        """
        Perform a workflow action on an entity.
        
        Request Body:
            entity_type: Model name
            entity_id: Document ID
            action: 'FORWARD', 'REVERT', or 'REJECT'
            remarks: Optional comments
            to_step: Target step (required for REVERT)
        """
        serializer = PerformActionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        entity_type = data['entity_type']
        entity_id = str(data['entity_id'])
        action_type = data['action']
        remarks = data.get('remarks', '')
        to_step = data.get('to_step')
        
        try:
            # Get active workflow
            instance = self._get_active_workflow(entity_type, entity_id)
            
            if not instance:
                return Response(
                    {'success': False, 'error': 'No active workflow found for this entity'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Perform the requested action
            if action_type == 'FORWARD':
                result = workflow_engine.forward(
                    instance=instance,
                    user=request.user,
                    remarks=remarks
                )
            elif action_type == 'REVERT':
                result = workflow_engine.revert(
                    instance=instance,
                    to_step_sequence=to_step,
                    user=request.user,
                    remarks=remarks
                )
            elif action_type == 'REJECT':
                result = workflow_engine.reject(
                    instance=instance,
                    user=request.user,
                    remarks=remarks
                )
            else:
                return Response(
                    {'success': False, 'error': f'Unknown action: {action_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if result.get('success'):
                return Response(result)
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error performing workflow action: {e}")
            return Response(
                {'success': False, 'error': 'Failed to perform workflow action'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='entity-history')
    def entity_history(self, request):
        """
        Get workflow history for an entity.
        
        Query Params:
            entity_type: Model name
            entity_id: Document ID
        """
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get all workflow instances for this entity (including completed)
            instances = WorkflowInstance.objects.filter(
                entity_type=entity_type,
                entity_id=str(entity_id)
            ).select_related('template').order_by('-started_at')
            
            if not instances.exists():
                return Response({
                    'has_history': False,
                    'workflows': []
                })
            
            # Get history for all workflows
            all_history = []
            for instance in instances:
                history = workflow_engine.get_workflow_history(instance)
                all_history.append({
                    'workflow_id': str(instance.id),
                    'template_name': instance.template.name,
                    'status': instance.status,
                    'status_display': instance.get_status_display(),
                    'started_at': instance.started_at.isoformat() if instance.started_at else None,
                    'completed_at': instance.completed_at.isoformat() if instance.completed_at else None,
                    'history': history
                })
            
            return Response({
                'has_history': True,
                'workflows': all_history
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting workflow history: {e}")
            return Response(
                {'error': 'Failed to get workflow history'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

