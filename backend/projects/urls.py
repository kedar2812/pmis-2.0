from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import ProjectViewSet, WorkPackageViewSet, DashboardStatsView, RecentActivityView
from .risk_views import (
    RiskViewSet, RiskDocumentViewSet, RiskMitigationActionViewSet,
    MitigationProofDocumentViewSet, ProjectRisksView
)

# Main router
router = DefaultRouter()
router.register(r'packages', WorkPackageViewSet, basename='workpackage')
router.register(r'risks', RiskViewSet, basename='risk')
router.register(r'', ProjectViewSet, basename='project')

# Nested router for risk documents and mitigations
risk_router = nested_routers.NestedDefaultRouter(router, r'risks', lookup='risk')
risk_router.register(r'documents', RiskDocumentViewSet, basename='risk-documents')
risk_router.register(r'mitigations', RiskMitigationActionViewSet, basename='risk-mitigations')

# Nested router for mitigation proof documents
mitigation_router = nested_routers.NestedDefaultRouter(risk_router, r'mitigations', lookup='mitigation')
mitigation_router.register(r'proofs', MitigationProofDocumentViewSet, basename='mitigation-proofs')

urlpatterns = [
    # Dashboard endpoints (must be before router)
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', RecentActivityView.as_view(), name='dashboard-activity'),
    
    # Project-specific risks endpoint
    path('<uuid:project_id>/risks/', ProjectRisksView.as_view(), name='project-risks'),
    
    # Router URLs
    path('', include(router.urls)),
    path('', include(risk_router.urls)),
    path('', include(mitigation_router.urls)),
]


