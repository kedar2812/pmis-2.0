from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that provides clear error messages for inactive users.
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
            # Let the parent class handle the invalid credentials error
            pass
        
        # Call parent validation (handles password check)
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view with enhanced error messages for inactive accounts.
    """
    serializer_class = CustomTokenObtainPairSerializer
