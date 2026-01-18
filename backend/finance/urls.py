from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FundHeadViewSet, BudgetLineItemViewSet, RABillViewSet, 
    ProjectFinanceSettingsViewSet, BOQItemViewSet, BOQMilestoneMappingViewSet,
    ApprovalRequestViewSet, NotificationViewSet, BOQExecutionViewSet, ProgressViewSet,
    EVMViewSet
)

router = DefaultRouter()
router.register(r'funds', FundHeadViewSet, basename='fund')
router.register(r'budgets', BudgetLineItemViewSet, basename='budget')
router.register(r'bills', RABillViewSet, basename='bill')
router.register(r'settings', ProjectFinanceSettingsViewSet, basename='finance-settings')
router.register(r'boq', BOQItemViewSet, basename='boq')
router.register(r'mappings', BOQMilestoneMappingViewSet, basename='boq-mapping')
router.register(r'approval-requests', ApprovalRequestViewSet, basename='approval-request')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'executions', BOQExecutionViewSet, basename='boq-execution')
router.register(r'progress', ProgressViewSet, basename='progress')
router.register(r'evm', EVMViewSet, basename='evm')

urlpatterns = [
    path('', include(router.urls)),
]
