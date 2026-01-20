from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThreadViewSet, NotificationViewSet, AuditLogViewSet, AttachmentViewSet

router = DefaultRouter()
router.register(r'threads', ThreadViewSet, basename='thread')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'attachments', AttachmentViewSet, basename='attachment')

# Additional URL patterns for legacy endpoints
urlpatterns = [
    path('', include(router.urls)),
    # Legacy endpoint for frontend compatibility
    path('messages/upload_attachment/', AttachmentViewSet.as_view({'post': 'upload'}), name='upload_attachment'),
]
