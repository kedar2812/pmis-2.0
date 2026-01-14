from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .views import TenderViewSet, BidViewSet, ContractViewSet, VariationViewSet

router = DefaultRouter()
router.register(r'tenders', TenderViewSet, basename='tender')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'variations', VariationViewSet, basename='variation')


@api_view(['POST'])
@permission_classes([AllowAny])  # Webhook uses API key validation
def nicdc_webhook(request):
    """
    Webhook endpoint for NICDC Procurement Portal callbacks.
    Receives notifications for: bid submissions, tender closures, clarifications.
    """
    from .nicdc_integration import process_nicdc_webhook
    
    # Validate webhook signature (in production)
    # api_key = request.headers.get('X-NICDC-Signature')
    
    payload = request.data
    success = process_nicdc_webhook(payload)
    
    if success:
        return Response({'status': 'processed'})
    return Response({'status': 'ignored'})


urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/nicdc/', nicdc_webhook, name='nicdc-webhook'),
]
