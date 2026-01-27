"""
Workflow URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowTemplateViewSet, WorkflowStepViewSet,
    WorkflowTriggerRuleViewSet, WorkflowInstanceViewSet,
    DelegationRuleViewSet, WorkflowActionsViewSet
)

router = DefaultRouter()
router.register(r'templates', WorkflowTemplateViewSet, basename='workflow-template')
router.register(r'steps', WorkflowStepViewSet, basename='workflow-step')
router.register(r'rules', WorkflowTriggerRuleViewSet, basename='workflow-rule')
router.register(r'instances', WorkflowInstanceViewSet, basename='workflow-instance')
router.register(r'delegations', DelegationRuleViewSet, basename='delegation')
router.register(r'actions', WorkflowActionsViewSet, basename='workflow-actions')

urlpatterns = [
    path('', include(router.urls)),
]

