"""
Risk Management Serializers

Provides serializers for:
- Risk CRUD operations
- Risk document attachments
- Mitigation action workflow
- Proof document uploads
"""
from rest_framework import serializers
from django.utils import timezone
from .risk_models import (
    Risk, RiskDocument, RiskMitigationAction, 
    MitigationProofDocument, RiskAuditLog
)
from .models import Project, WorkPackage


class RiskListSerializer(serializers.ModelSerializer):
    """Serializer for risk list view with summary fields."""
    
    project_name = serializers.CharField(source='project.name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_open = serializers.IntegerField(read_only=True)
    mitigation_count = serializers.IntegerField(read_only=True)
    document_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Risk
        fields = [
            'id', 'risk_code', 'title', 'category', 'risk_source',
            'probability', 'impact', 'risk_score', 'severity',
            'status', 'response_strategy',
            'identified_date', 'target_resolution',
            'cost_impact', 'schedule_impact_days',
            'project', 'project_name', 'owner', 'owner_name',
            'is_overdue', 'days_open', 'mitigation_count', 'document_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'risk_code', 'risk_score', 'severity', 'created_at', 'updated_at']
    
    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.username
        return None
    
    def get_document_count(self, obj):
        return obj.risk_documents.count()


class RiskDocumentSerializer(serializers.ModelSerializer):
    """Serializer for risk documents."""
    
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RiskDocument
        fields = [
            'id', 'risk', 'document', 'document_type', 'notes',
            'document_title', 'document_url',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']
    
    def get_document_url(self, obj):
        if obj.document and obj.document.current_version:
            return obj.document.current_version.file.url
        return None
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
        return None


class MitigationProofDocumentSerializer(serializers.ModelSerializer):
    """Serializer for mitigation proof documents."""
    
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MitigationProofDocument
        fields = [
            'id', 'mitigation_action', 'document', 'description',
            'document_title', 'document_url',
            'uploaded_by', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']
    
    def get_document_url(self, obj):
        if obj.document and obj.document.current_version:
            return obj.document.current_version.file.url
        return None


class RiskMitigationActionListSerializer(serializers.ModelSerializer):
    """Serializer for mitigation action list."""
    
    created_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    can_submit = serializers.BooleanField(read_only=True)
    has_proof = serializers.BooleanField(read_only=True)
    proof_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RiskMitigationAction
        fields = [
            'id', 'action_number', 'action_type', 'title', 'description',
            'action_date', 'target_completion', 'actual_completion',
            'effectiveness_rating', 'residual_probability', 'residual_impact',
            'cost_incurred', 'status',
            'submitted_at', 'reviewed_at', 'review_comments',
            'created_by', 'created_by_name', 'reviewed_by', 'reviewed_by_name',
            'can_submit', 'has_proof', 'proof_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'action_number', 'status', 'submitted_at', 
            'reviewed_at', 'reviewed_by', 'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None
    
    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
        return None
    
    def get_proof_count(self, obj):
        return obj.proof_documents.count()


class RiskMitigationActionDetailSerializer(RiskMitigationActionListSerializer):
    """Detailed serializer with nested proof documents."""
    
    proof_documents = MitigationProofDocumentSerializer(many=True, read_only=True)
    risk_code = serializers.CharField(source='risk.risk_code', read_only=True)
    
    class Meta(RiskMitigationActionListSerializer.Meta):
        fields = RiskMitigationActionListSerializer.Meta.fields + [
            'proof_documents', 'risk_code'
        ]


class RiskMitigationActionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating mitigation actions."""
    
    class Meta:
        model = RiskMitigationAction
        fields = [
            'risk', 'action_type', 'title', 'description',
            'action_date', 'target_completion',
            'effectiveness_rating', 'residual_probability', 'residual_impact',
            'cost_incurred'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class RiskDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single risk view."""
    
    project_name = serializers.CharField(source='project.name', read_only=True)
    work_package_name = serializers.CharField(source='work_package.name', read_only=True)
    schedule_task_name = serializers.CharField(source='schedule_task.name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    is_overdue = serializers.BooleanField(read_only=True)
    days_open = serializers.IntegerField(read_only=True)
    mitigation_count = serializers.IntegerField(read_only=True)
    
    risk_documents = RiskDocumentSerializer(many=True, read_only=True)
    mitigation_actions = RiskMitigationActionListSerializer(many=True, read_only=True)
    
    # Display values for enums
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    probability_display = serializers.CharField(source='get_probability_display', read_only=True)
    impact_display = serializers.CharField(source='get_impact_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    response_strategy_display = serializers.CharField(source='get_response_strategy_display', read_only=True)
    
    class Meta:
        model = Risk
        fields = [
            'id', 'risk_code', 'title', 'description',
            # Categorization
            'category', 'category_display', 'risk_source',
            # Assessment
            'probability', 'probability_display',
            'impact', 'impact_display',
            'risk_score', 'severity', 'severity_display',
            # Status
            'status', 'status_display',
            'identified_date', 'target_resolution', 'actual_closure', 'review_date',
            # Response
            'response_strategy', 'response_strategy_display',
            'mitigation_plan', 'contingency_plan',
            'cost_impact', 'schedule_impact_days', 'residual_risk_score',
            # Linkages
            'project', 'project_name',
            'work_package', 'work_package_name',
            'schedule_task', 'schedule_task_name',
            'owner', 'owner_name',
            'created_by', 'created_by_name',
            'edms_folder',
            # Computed
            'is_overdue', 'days_open', 'mitigation_count',
            # Related
            'risk_documents', 'mitigation_actions',
            # Audit
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'risk_code', 'risk_score', 'severity', 'edms_folder',
            'created_at', 'updated_at'
        ]
    
    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.username
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None


class RiskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating risks."""
    
    class Meta:
        model = Risk
        fields = [
            'title', 'description',
            'category', 'risk_source',
            'probability', 'impact',
            'status', 'target_resolution', 'review_date',
            'response_strategy', 'mitigation_plan', 'contingency_plan',
            'cost_impact', 'schedule_impact_days',
            'project', 'work_package', 'schedule_task', 'owner'
        ]
    
    def validate_project(self, value):
        """Ensure project exists and user has access."""
        if not value:
            raise serializers.ValidationError("Project is required.")
        return value
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class RiskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating risks."""
    
    class Meta:
        model = Risk
        fields = [
            'title', 'description',
            'category', 'risk_source',
            'probability', 'impact',
            'status', 'target_resolution', 'actual_closure', 'review_date',
            'response_strategy', 'mitigation_plan', 'contingency_plan',
            'cost_impact', 'schedule_impact_days', 'residual_risk_score',
            'work_package', 'schedule_task', 'owner',
            'is_active'
        ]
    
    def update(self, instance, validated_data):
        # Track status changes for audit log
        old_status = instance.status
        instance = super().update(instance, validated_data)
        
        # Create audit log for status changes
        if 'status' in validated_data and old_status != validated_data['status']:
            RiskAuditLog.objects.create(
                risk=instance,
                action=RiskAuditLog.Action.STATUS_CHANGED,
                actor=self.context['request'].user,
                previous_values={'status': old_status},
                new_values={'status': validated_data['status']}
            )
        
        return instance


class RiskStatsSerializer(serializers.Serializer):
    """Serializer for risk statistics dashboard."""
    
    total = serializers.IntegerField()
    by_severity = serializers.DictField()
    by_status = serializers.DictField()
    by_category = serializers.DictField()
    overdue_count = serializers.IntegerField()
    avg_days_open = serializers.FloatField()
    total_cost_impact = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_schedule_impact = serializers.IntegerField()
    top_risks = RiskListSerializer(many=True)


class RiskAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for risk audit logs."""
    
    class Meta:
        model = RiskAuditLog
        fields = [
            'id', 'risk', 'action', 'actor', 'actor_name', 'actor_role',
            'details', 'previous_values', 'new_values',
            'timestamp', 'ip_address'
        ]
        read_only_fields = fields


class MitigationActionSubmitSerializer(serializers.Serializer):
    """Serializer for submitting a mitigation action."""
    
    def validate(self, data):
        action = self.instance
        if not action.proof_documents.exists():
            raise serializers.ValidationError({
                "proof_documents": "Cannot submit without at least one proof document."
            })
        if action.status != RiskMitigationAction.Status.DRAFT:
            raise serializers.ValidationError({
                "status": f"Can only submit actions in DRAFT status. Current: {action.status}"
            })
        return data


class MitigationActionReviewSerializer(serializers.Serializer):
    """Serializer for approving/rejecting a mitigation action."""
    
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comments = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        action = self.instance
        if action.status != RiskMitigationAction.Status.SUBMITTED:
            raise serializers.ValidationError({
                "status": f"Can only review actions in SUBMITTED status. Current: {action.status}"
            })
        if data['action'] == 'reject' and not data.get('comments'):
            raise serializers.ValidationError({
                "comments": "Rejection reason is required."
            })
        return data
