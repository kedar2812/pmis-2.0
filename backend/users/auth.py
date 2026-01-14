from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that provides clear error messages for inactive users
    and invalid credentials.
    """
    
    def validate(self, attrs):
        # Get the user first to check their status
        username = attrs.get('username', '')
        
        try:
            user = User.objects.get(username=username)
            
            # Check if user is inactive
            if not user.is_active:
                raise serializers.ValidationError({
                    'detail': 'Your account has been deactivated. Please contact your supervisor or administrator.',
                    'code': 'account_deactivated'
                })
            
            # Check account status
            if hasattr(user, 'account_status') and user.account_status == 'DISABLED':
                raise serializers.ValidationError({
                    'detail': 'Your account has been disabled. Please contact your supervisor or administrator.',
                    'code': 'account_disabled'
                })
            
            # Check if account is pending approval
            if hasattr(user, 'account_status') and user.account_status == 'PENDING':
                raise serializers.ValidationError({
                    'detail': 'Your account is pending approval. Please wait for administrator approval.',
                    'code': 'account_pending'
                })
                
        except User.DoesNotExist:
            # User doesn't exist - will be caught by parent validation
            pass
        
        # Call parent validation (handles password check)
        try:
            data = super().validate(attrs)
            return data
        except Exception as e:
            # Catch ANY authentication error and provide clear message
            error_message = str(e)
            
            # Replace default error messages with user-friendly ones
            if 'No active account' in error_message or 'Unable to log in' in error_message or 'given credentials' in error_message:
                raise serializers.ValidationError({
                    'detail': 'Invalid credentials. Please check your username and password.',
                    'code': 'invalid_credentials'
                })
            
            # Re-raise other errors as-is
            raise


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view with enhanced error messages for inactive accounts.
    """
    serializer_class = CustomTokenObtainPairSerializer
