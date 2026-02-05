"""
Custom throttle classes for API rate limiting.
Provides fine-grained control over API access rates for different endpoints.
"""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class LoginThrottle(UserRateThrottle):
    """
    Rate limit for login endpoint to prevent brute force attacks.
    Default: 5 attempts per minute
    """
    scope = 'login'
    rate = '5/minute'


class DashboardThrottle(UserRateThrottle):
    """
    Rate limit for dashboard stats endpoint to prevent excessive load.
    Default: 60 requests per hour
    """
    scope = 'dashboard'
    rate = '60/hour'


class MasterDataThrottle(UserRateThrottle):
    """
    Rate limit for master data endpoints (less restrictive as they're cached).
    Default: 500 requests per hour
    """
    scope = 'masterdata'
    rate = '500/hour'


class BulkOperationThrottle(UserRateThrottle):
    """
    Rate limit for bulk operations (imports, exports).
    Default: 10 requests per hour
    """
    scope = 'bulk'
    rate = '10/hour'
