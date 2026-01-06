from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenderViewSet, BidViewSet, ContractViewSet, VariationViewSet

router = DefaultRouter()
router.register(r'tenders', TenderViewSet, basename='tender')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'variations', VariationViewSet, basename='variation')

urlpatterns = [
    path('', include(router.urls)),
]
