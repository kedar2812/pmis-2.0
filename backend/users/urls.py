from django.urls import path
from .views import (
    UserProfileView, UserListView, UserDetailView,
    InviteUserView, AcceptInviteView,
    ContractorRegistrationView, PendingUsersView,
    ApproveUserView, RejectUserView, ToggleUserStatusView,
    PasswordResetRequestView, PasswordResetConfirmView
)

urlpatterns = [
    # Current user profile
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('me/', UserProfileView.as_view(), name='user-me'),  # Alias for frontend compatibility
    
    # User management (Admin)
    path('', UserListView.as_view(), name='user-list'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/toggle-status/', ToggleUserStatusView.as_view(), name='user-toggle-status'),
    
    # Invite workflow (Internal users)
    path('invite/', InviteUserView.as_view(), name='user-invite'),
    path('accept-invite/', AcceptInviteView.as_view(), name='user-accept-invite'),
    
    # Contractor registration (Public)
    path('register-contractor/', ContractorRegistrationView.as_view(), name='contractor-register'),
    
    # Password reset (Public)
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Approval workflow
    path('pending/', PendingUsersView.as_view(), name='user-pending'),
    path('<int:pk>/approve/', ApproveUserView.as_view(), name='user-approve'),
    path('<int:pk>/reject/', RejectUserView.as_view(), name='user-reject'),
]
