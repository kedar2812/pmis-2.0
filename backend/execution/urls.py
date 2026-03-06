from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailySiteLogViewSet, SiteImageViewSet, ProjectTaskListView

router = DefaultRouter()
router.register(r'logs', DailySiteLogViewSet, basename='daily-site-log')
router.register(r'images', SiteImageViewSet, basename='site-image')

urlpatterns = [
    path('', include(router.urls)),
    # Endpoint for frontend task dropdown (filtered by project)
    path('tasks/', ProjectTaskListView.as_view(), name='execution-task-list'),
]
