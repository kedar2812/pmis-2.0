from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScheduleTaskViewSet

router = DefaultRouter()
router.register(r'tasks', ScheduleTaskViewSet, basename='scheduletask')

urlpatterns = [
    path('', include(router.urls)),
]
