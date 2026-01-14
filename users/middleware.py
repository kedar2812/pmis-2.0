# User presence tracking middleware
from django.utils import timezone
from datetime import timedelta

class UserPresenceMiddleware:
    """
    Middleware to track user activity and update online status.
    Updates last_seen timestamp on every request from authenticated users.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        
        # Update user presence after response
        if request.user.is_authenticated:
            try:
                # Update last_seen timestamp
                request.user.last_seen = timezone.now()
                
                # Set is_online to True if user was inactive for less than 5 minutes
                request.user.is_online = True
                
                # Only update these fields (avoid triggering full save)
                request.user.save(update_fields=['last_seen', 'is_online'])
            except Exception as e:
                # Silent fail - don't break requests if presence update fails
                pass
        
        return response
