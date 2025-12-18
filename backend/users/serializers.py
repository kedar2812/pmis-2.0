from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer for listing/viewing users."""
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'account_status', 'department', 'phone_number', 'designation',
            'company_name', 'is_contractor', 'date_joined', 'last_login',
            'full_address'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_contractor']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with all fields."""
    full_address = serializers.ReadOnlyField()
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'account_status', 'department', 'phone_number', 'designation',
            # Contractor fields
            'contractor_id', 'pan_number', 'gstin_number', 'eproc_number',
            'company_name',
            # Address
            'building_number', 'street', 'area', 'city', 'state', 'country', 'zip_code',
            'full_address',
            # Bank details
            'bank_name', 'bank_branch', 'ifsc_code', 'account_number', 'account_type',
            # Approval
            'approved_by', 'approved_by_name', 'approved_at', 'rejection_reason',
            # Meta
            'is_contractor', 'date_joined', 'last_login', 'is_active'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_contractor', 'approved_by_name']
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return None


class InviteUserSerializer(serializers.Serializer):
    """Serializer for inviting internal users."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=[
        ('SPV_Official', 'SPV Official'),
        ('PMNC_Team', 'PMNC Team'),
        ('Consultant_Design', 'Design Consultant'),
        ('Govt_Department', 'Government Department'),
        ('NICDC_HQ', 'NICDC HQ'),
    ])
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class AcceptInviteSerializer(serializers.Serializer):
    """Serializer for accepting invite and setting password."""
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Validate password strength
        validate_password(data['password'])
        
        # Validate token
        try:
            user = User.objects.get(invite_token=data['token'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid or expired invite token."})
        
        from django.utils import timezone
        if user.invite_expires_at and timezone.now() > user.invite_expires_at:
            raise serializers.ValidationError({"token": "Invite link has expired."})
        
        data['user'] = user
        return data


class ContractorRegistrationSerializer(serializers.Serializer):
    """Serializer for contractor self-registration."""
    # Account credentials
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Contact Person
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=15)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Company Details
    company_name = serializers.CharField(max_length=255)
    
    # Legal Identifiers
    pan_number = serializers.CharField(max_length=10)
    gstin_number = serializers.CharField(max_length=15)
    eproc_number = serializers.CharField(max_length=50)
    
    # Address
    building_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    street = serializers.CharField(max_length=255)
    area = serializers.CharField(max_length=100, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100, default='India')
    zip_code = serializers.CharField(max_length=10)
    
    # Bank Details
    bank_name = serializers.CharField(max_length=255)
    bank_branch = serializers.CharField(max_length=255, required=False, allow_blank=True)
    ifsc_code = serializers.CharField(max_length=11)
    account_number = serializers.CharField(max_length=20)
    account_type = serializers.ChoiceField(choices=[
        ('SAVINGS', 'Savings'),
        ('CURRENT', 'Current'),
        ('OTHER', 'Other'),
    ], default='CURRENT')
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_pan_number(self, value):
        # Basic PAN format validation: ABCDE1234F
        import re
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', value.upper()):
            raise serializers.ValidationError("Invalid PAN format. Expected: ABCDE1234F")
        return value.upper()
    
    def validate_gstin_number(self, value):
        # Basic GSTIN format: 22AAAAA0000A1Z5
        import re
        if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$', value.upper()):
            raise serializers.ValidationError("Invalid GSTIN format.")
        return value.upper()
    
    def validate_ifsc_code(self, value):
        # IFSC format: ABCD0123456
        import re
        if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', value.upper()):
            raise serializers.ValidationError("Invalid IFSC code format.")
        return value.upper()
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(data['password'])
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        # Generate username from first name and last name (epc_contractor_firstname_l)
        first_name = validated_data['first_name']
        last_name = validated_data['last_name']
        
        # Clean names (lowercase, remove spaces/special chars)
        clean_first_name = ''.join(e for e in first_name if e.isalnum()).lower()
        clean_last_initial = ''.join(e for e in last_name if e.isalnum()).lower()[0] if last_name else 'x'
        
        base_username = f"epc_contractor_{clean_first_name}_{clean_last_initial}"
        
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create_user(
            username=username,
            password=password,
            role=User.Roles.EPC_CONTRACTOR,
            account_status=User.AccountStatus.PENDING_APPROVAL,
            is_active=False,  # Contractors can't login until approved
            **validated_data
        )
        return user


class ApproveUserSerializer(serializers.Serializer):
    """Serializer for approving pending users."""
    pass  # No input needed, just action


class RejectUserSerializer(serializers.Serializer):
    """Serializer for rejecting pending users."""
    reason = serializers.CharField(max_length=500)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (admin)."""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'role', 'department',
            'phone_number', 'designation', 'account_status', 'is_active',
            # Contractor fields
            'contractor_id', 'pan_number', 'gstin_number', 'eproc_number',
            'company_name',
            # Address
            'building_number', 'street', 'area', 'city', 'state', 'country', 'zip_code',
            # Bank
            'bank_name', 'bank_branch', 'ifsc_code', 'account_number', 'account_type',
        ]
