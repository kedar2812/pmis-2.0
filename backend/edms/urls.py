from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, download_file

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    path('download/', download_file, name='download_file'),
]
