from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FundHeadViewSet, BudgetLineItemViewSet, RABillViewSet, ProjectFinanceSettingsViewSet, BOQItemViewSet, BOQMilestoneMappingViewSet

router = DefaultRouter()
router.register(r'funds', FundHeadViewSet, basename='fund')
router.register(r'budgets', BudgetLineItemViewSet, basename='budget')
router.register(r'bills', RABillViewSet, basename='bill')
router.register(r'settings', ProjectFinanceSettingsViewSet, basename='finance-settings')
router.register(r'boq', BOQItemViewSet, basename='boq')
router.register(r'mappings', BOQMilestoneMappingViewSet, basename='boq-mapping')

urlpatterns = [
    path('', include(router.urls)),
]
