from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, WorkPackageViewSet

router = DefaultRouter()
router.register(r'packages', WorkPackageViewSet, basename='workpackage')
router.register(r'', ProjectViewSet, basename='project')

urlpatterns = [
    path('', include(router.urls)),
]
