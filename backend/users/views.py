from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

from .serializers import (
    UserSerializer, UserDetailSerializer, InviteUserSerializer,
    AcceptInviteSerializer, ContractorRegistrationSerializer,
    ApproveUserSerializer, RejectUserSerializer, UserUpdateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    """Permission for SPV and NICDC HQ users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['SPV_Official', 'NICDC_HQ']


class UserProfileView(APIView):
    """Get current user's profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        """Allow users to update their own basic info."""
        allowed_fields = ['first_name', 'last_name', 'phone_number', 'designation']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        for key, value in update_data.items():
            setattr(request.user, key, value)
        request.user.save()
        
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)


class UserListView(ListAPIView):
    """List all users (Accessible to all authenticated users for chat)."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(account_status=status_filter)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_name__icontains=search)
            )
        
        return queryset


class UserDetailView(RetrieveUpdateAPIView):
    """Get/Update user details (Admin only)."""
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer


class InviteUserView(APIView):
    """Invite internal user (Admin only)."""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Create user with pending invite status
        username = data['email'].split('@')[0]
        counter = 1
        base_username = username
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create(
            username=username,
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data['role'],
            department=data.get('department', ''),
            designation=data.get('designation', ''),
            phone_number=data.get('phone_number', ''),
            account_status=User.AccountStatus.PENDING_INVITE,
            is_active=False  # Can't login until invite is accepted
        )
        
        # Generate invite token
        token = user.generate_invite_token()
        
        # Send invite email
        invite_url = f"{settings.FRONTEND_URL}/accept-invite/{token}"
        self._send_invite_email(user, invite_url)
        
        return Response({
            'message': f'Invite sent to {user.email}',
            'user_id': user.id,
            'invite_url': invite_url  # For testing; remove in production
        }, status=status.HTTP_201_CREATED)
    
    def _send_invite_email(self, user, invite_url):
        """Send invite email via SendGrid."""
        try:
            from .email_service import send_invite_email
            send_invite_email(user, invite_url)
        except Exception as e:
            print(f"Failed to send invite email: {e}")
            # Don't fail the request if email fails


class AcceptInviteView(APIView):
    """Accept invite and set password (Public)."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        password = serializer.validated_data['password']
        
        user.accept_invite(password)
        
        # Send welcome email
        try:
            from .email_service import send_welcome_email
            send_welcome_email(user)
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
        
        return Response({
            'message': 'Account activated successfully. You can now login.',
            'username': user.username,
            'email': user.email
        })
    
    def get(self, request):
        """Validate invite token and return user info."""
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import uuid
            token_uuid = uuid.UUID(token)
            user = User.objects.get(invite_token=token_uuid)
            
            if user.invite_expires_at and timezone.now() > user.invite_expires_at:
                return Response({'error': 'Invite link has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'valid': True,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.get_role_display()
            })
        except (ValueError, User.DoesNotExist):
            return Response({'error': 'Invalid invite token'}, status=status.HTTP_400_BAD_REQUEST)


class ContractorRegistrationView(APIView):
    """Contractor self-registration (Public)."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ContractorRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        
        # Send confirmation email
        try:
            from .email_service import send_registration_confirmation
            send_registration_confirmation(user)
        except Exception as e:
            print(f"Failed to send confirmation email: {e}")
        
        # Notify admins
        try:
            from .email_service import notify_admins_new_registration
            notify_admins_new_registration(user)
        except Exception as e:
            print(f"Failed to notify admins: {e}")
        
        return Response({
            'message': 'Registration submitted successfully. Your account is pending approval.',
            'user_id': user.id,
            'status': 'PENDING_APPROVAL'
        }, status=status.HTTP_201_CREATED)


class PendingUsersView(ListAPIView):
    """List users pending approval (Admin only)."""
    serializer_class = UserDetailSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        return User.objects.filter(
            account_status=User.AccountStatus.PENDING_APPROVAL
        ).order_by('-date_joined')


class ApproveUserView(APIView):
    """Approve pending user (Admin only)."""
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.account_status != User.AccountStatus.PENDING_APPROVAL:
            return Response({
                'error': f'User is not pending approval. Current status: {user.account_status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.account_status = User.AccountStatus.ACTIVE
        user.is_active = True
        user.approved_by = request.user
        user.approved_at = timezone.now()
        user.save()
        
        # If this is a contractor, auto-create contractor master record
        contractor_created = False
        if user.role == 'EPC_Contractor':
            contractor_created = self._create_contractor_record(user)
        
        # Send approval email
        try:
            from .email_service import send_approval_notification
            send_approval_notification(user)
        except Exception as e:
            print(f"Failed to send approval email: {e}")
        
        return Response({
            'message': f'User {user.email} has been approved.',
            'user': UserDetailSerializer(user).data,
            'contractor_created': contractor_created
        })
    
    def _create_contractor_record(self, user):
        """Auto-create contractor master record for approved contractor user."""
        try:
            from masters.models.entities import Contractor
            
            # Check if contractor already exists linked to this user
            existing = Contractor.objects.filter(linked_user=user).first()
            if existing:
                return True  # Already linked
            
            # Check if contractor already exists with same PAN
            if user.pan_number:
                existing = Contractor.objects.filter(pan=user.pan_number).first()
                if existing:
                    # Link existing contractor to user
                    existing.linked_user = user
                    existing.save()
                    return True
            
            # Generate unique contractor code
            last_contractor = Contractor.objects.order_by('-created_at').last()
            if last_contractor and last_contractor.code.startswith('CON-'):
                try:
                    last_num = int(last_contractor.code.split('-')[1])
                    next_num = last_num + 1
                except:
                    next_num = Contractor.objects.count() + 1
            else:
                next_num = Contractor.objects.count() + 1
            code = f"CON-{next_num:04d}"
            
            # Ensure code is unique
            while Contractor.objects.filter(code=code).exists():
                next_num += 1
                code = f"CON-{next_num:04d}"
            
            # Create new contractor record using model's actual fields
            Contractor.objects.create(
                code=code,
                name=user.company_name or f"{user.first_name} {user.last_name}",
                contractor_type='Proprietorship',  # Default, user can update later
                registration_class=user.registration_class or '',
                pan=user.pan_number or '',
                gstin=user.gstin_number or '',
                contact_person=f"{user.first_name} {user.last_name}",
                email=user.email,
                phone=user.phone_number or '',
                address=user.full_address or '',
                blacklisted=False,
                linked_user=user,
            )
            return True
        except Exception as e:
            print(f"Failed to auto-create contractor record: {e}")
            import traceback
            traceback.print_exc()
            return False


class RejectUserView(APIView):
    """Reject pending user (Admin only)."""
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        serializer = RejectUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.account_status != User.AccountStatus.PENDING_APPROVAL:
            return Response({
                'error': f'User is not pending approval. Current status: {user.account_status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.account_status = User.AccountStatus.DISABLED
        user.rejection_reason = serializer.validated_data['reason']
        user.save()
        
        # Send rejection email
        try:
            from .email_service import send_rejection_notification
            send_rejection_notification(user, serializer.validated_data['reason'])
        except Exception as e:
            print(f"Failed to send rejection email: {e}")
        
        return Response({
            'message': f'User {user.email} has been rejected.',
        })


class ToggleUserStatusView(APIView):
    """Enable/Disable user account (Admin only)."""
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Toggle active status
        new_status = request.data.get('is_active')
        if new_status is not None:
            user.is_active = new_status
            user.account_status = User.AccountStatus.ACTIVE if new_status else User.AccountStatus.DISABLED
            user.save()
        
        return Response({
            'message': f'User status updated.',
            'is_active': user.is_active,
            'account_status': user.account_status
        })


class PasswordResetRequestView(APIView):
    """Request password reset email (Public)."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            token = user.generate_password_reset_token()
            
            # Send password reset email
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
            self._send_reset_email(user, reset_url)
            
        except User.DoesNotExist:
            # Don't reveal if email exists - still return success
            pass
        
        # Always return success to prevent email enumeration
        return Response({
            'message': 'If an account exists with this email, a password reset link has been sent.',
            'success': True
        })
    
    def _send_reset_email(self, user, reset_url):
        """Send password reset email."""
        try:
            from .email_service import send_password_reset_email
            send_password_reset_email(user, reset_url)
        except Exception as e:
            print(f"Failed to send password reset email: {e}")


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token (Public)."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['password']
        
        user.reset_password(new_password)
        
        return Response({
            'message': 'Password has been reset successfully. You can now login.',
            'success': True
        })
    
    def get(self, request):
        """Validate reset token and return user info."""
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import uuid
            token_uuid = uuid.UUID(token)
            user = User.objects.get(password_reset_token=token_uuid)
            
            if user.password_reset_expires_at and timezone.now() > user.password_reset_expires_at:
                return Response({'error': 'Password reset link has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'valid': True,
                'email': user.email,
                'first_name': user.first_name,
            })
        except (ValueError, User.DoesNotExist):
            return Response({'error': 'Invalid reset token'}, status=status.HTTP_400_BAD_REQUEST)
