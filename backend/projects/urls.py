from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, WorkPackageViewSet, DashboardStatsView, RecentActivityView

router = DefaultRouter()
router.register(r'packages', WorkPackageViewSet, basename='workpackage')
router.register(r'', ProjectViewSet, basename='project')

urlpatterns = [
    # Dashboard endpoints (must be before router)
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', RecentActivityView.as_view(), name='dashboard-activity'),
    # Router URLs
    path('', include(router.urls)),
]

