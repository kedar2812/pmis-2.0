# EDMS URL Configuration
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FolderViewSet, DocumentViewSet, ApprovalViewSet, AuditLogViewSet, NotingSheetViewSet

router = DefaultRouter()
router.register(r'folders', FolderViewSet, basename='folder')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'approvals', ApprovalViewSet, basename='approval')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'noting-sheets', NotingSheetViewSet, basename='notingsheet')

urlpatterns = [
    path('', include(router.urls)),
]

