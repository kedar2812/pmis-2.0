from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThreadViewSet, NotificationViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'threads', ThreadViewSet, basename='thread')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('', include(router.urls)),
]
