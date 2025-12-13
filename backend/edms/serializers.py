from rest_framework import serializers
from .models import Document, DocumentVersion, NotingSheet, AuditLog

class NotingSheetSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = NotingSheet
        fields = ['id', 'user', 'user_name', 'role', 'remark_text', 'is_ruling', 'timestamp']
        read_only_fields = ['id', 'user', 'role', 'timestamp', 'is_ruling']

class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'uploaded_by_name', 'change_remarks', 'timestamp']

class DocumentSerializer(serializers.ModelSerializer):
    notings = NotingSheetSerializer(many=True, read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'project', 'project_name', 'package_id', 'title', 'category', 
            'current_version', 'status', 'file_hash', 'metadata', 
            'created_at', 'updated_at', 'notings', 'versions'
        ]
        read_only_fields = ['id', 'current_version', 'status', 'file_hash', 'created_at', 'updated_at']

class DocumentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for uploading new documents.
    """
    file = serializers.FileField(write_only=True)
    
    class Meta:
        model = Document
        fields = ['project', 'package_id', 'title', 'category', 'metadata', 'file']

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'actor_name', 'action', 'resource_id', 'details', 'ip_address', 'timestamp']
