"""
API Views for Bank and IFSC lookup
Secure, fast, and easy to use
"""
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.cache import cache
from .models import BankBranch
from .serializers import BankBranchSerializer


class BankListView(APIView):
    """
    Get list of unique bank names for dropdown
    Cached for 24 hours for performance
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # Try to get from cache first
        cache_key = 'bank_names_list'
        bank_names = cache.get(cache_key)
        
        if bank_names is None:
            # Fetch from database
            bank_names = list(
                BankBranch.objects
                .filter(is_active=True)
                .values_list('bank_name', flat=True)
                .distinct()
                .order_by('bank_name')
            )
            
            # If no banks found, return helpful error message
            if not bank_names:
                return Response({
                    'count': 0,
                    'banks': [],
                    'warning': 'No bank data available. Please run: python manage.py import_ifsc_data',
                    'help': 'Visit https://github.com/snarayanank2/indian_banks for data source'
                }, status=status.HTTP_200_OK)
            
            # Cache for 24 hours
            cache.set(cache_key, bank_names, 60 * 60 * 24)
        
        return Response({
            'count': len(bank_names),
            'banks': bank_names
        })


class IFSCLookupView(APIView):
    """
    Validate IFSC code and return branch details
    Public endpoint - no authentication required
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, ifsc_code):
        # Normalize IFSC code
        ifsc_code = ifsc_code.upper().strip()
        
        # Validate format
        if not self._is_valid_ifsc_format(ifsc_code):
            return Response(
                {
                    'error': 'Invalid IFSC format',
                    'message': 'IFSC code must be 11 characters (Format: ABCD0123456)',
                    'valid': False
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try cache first
        cache_key = f'ifsc_{ifsc_code}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # Lookup in database
        try:
            branch = BankBranch.objects.get(ifsc_code=ifsc_code, is_active=True)
            serializer = BankBranchSerializer(branch)
            data = serializer.data
            data['valid'] = True
            
            # Cache for 7 days
            cache.set(cache_key, data, 60 * 60 * 24 * 7)
            
            return Response(data)
            
        except BankBranch.DoesNotExist:
            return Response(
                {
                    'error': 'IFSC code not found',
                    'message': f'No branch found with IFSC code: {ifsc_code}',
                    'valid': False
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _is_valid_ifsc_format(self, ifsc):
        """
        Validate IFSC code format
        Format: ABCD0123456 (4 letters, 0, then 6 alphanumeric)
        """
        return bool(re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc))


class IFSCStatsView(APIView):
    """Get statistics about IFSC database (for admin monitoring)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        total_branches = BankBranch.objects.count()
        active_branches = BankBranch.objects.filter(is_active=True).count()
        total_banks = BankBranch.objects.values('bank_name').distinct().count()
        upi_enabled = BankBranch.objects.filter(upi=True).count()
        
        return Response({
            'total_branches': total_branches,
            'active_branches': active_branches,
            'inactive_branches': total_branches - active_branches,
            'total_banks': total_banks,
            'upi_enabled_branches': upi_enabled,
            'last_update': BankBranch.objects.order_by('-updated_at').first().updated_at if BankBranch.objects.exists() else None
        })
