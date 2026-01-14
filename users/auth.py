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
            # User doesn't exist - let parent validation handle it with clear error
            pass
        
        #  Call parent validation (handles password check)
        # This will raise ValidationError with 'No active account found' if credentials are wrong
        try:
            return super().validate(attrs)
        except serializers.ValidationError as e:
            # Rephrase the default error to be clearer for users
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            if 'No active account' in str(error_detail) or 'Unable to log in' in str(error_detail):
                raise serializers.ValidationError({
                    'detail': 'Invalid credentials. Please check your username and password.',
                    'code': 'invalid_credentials'
                })
            raise


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view with enhanced error messages for inactive accounts.
    """
    serializer_class = CustomTokenObtainPairSerializer
