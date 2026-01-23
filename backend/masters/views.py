from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models

from .models import (
    Zone, Circle, Division, SubDivision,
    District, Town,
    SchemeType, Scheme, WorkType, ProjectCategory,
    Contractor, ContractorBankAccount,
    ETPMaster,
    ETPMaster,
    Country, State, LocationDistrict, City,
)
from .serializers import (
    ZoneSerializer, CircleSerializer, DivisionSerializer, SubDivisionSerializer,
    DistrictSerializer, TownSerializer,
    SchemeTypeSerializer, SchemeSerializer, WorkTypeSerializer, ProjectCategorySerializer,
    ContractorSerializer, ContractorListSerializer, ContractorBankAccountSerializer,
    ETPMasterSerializer,
    CircleNestedSerializer, DivisionNestedSerializer, SubDivisionNestedSerializer, TownNestedSerializer,
    CountrySerializer, StateSerializer, CitySerializer,
    CountrySerializer, StateSerializer, CitySerializer,
    StateNestedSerializer, CityNestedSerializer, LocationDistrictSerializer, LocationDistrictNestedSerializer,
)


class IsSuperUserOrReadOnly(permissions.BasePermission):
    """
    Custom permission: 
    - All authenticated users can READ
    - Only superusers or Master_Data_Managers group can CREATE/UPDATE/DELETE
    """
    def has_permission(self, request, view):
        # Allow read-only for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions only for superusers or Master_Data_Managers group
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check for Master_Data_Managers group
        return request.user.groups.filter(name='Master_Data_Managers').exists()


class BaseMasterViewSet(viewsets.ModelViewSet):
    """Base viewset with common settings for all masters"""
    permission_classes = [IsSuperUserOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]


# ========== Hierarchy ViewSets ==========

class ZoneViewSet(BaseMasterViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    filterset_fields = ['status']
    search_fields = ['code', 'name', 'state_covered']
    ordering_fields = ['code', 'name']
    
    @action(detail=True, methods=['get'])
    def circles(self, request, pk=None):
        """Get all circles under this zone"""
        zone = self.get_object()
        circles = zone.circles.filter(status='Active')
        serializer = CircleNestedSerializer(circles, many=True)
        return Response(serializer.data)


class CircleViewSet(BaseMasterViewSet):
    queryset = Circle.objects.select_related('zone').all()
    serializer_class = CircleSerializer
    filterset_fields = ['status', 'authority_level', 'zone']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name']
    
    @action(detail=True, methods=['get'])
    def divisions(self, request, pk=None):
        """Get all divisions under this circle"""
        circle = self.get_object()
        divisions = circle.divisions.filter(status='Active')
        serializer = DivisionNestedSerializer(divisions, many=True)
        return Response(serializer.data)


class DivisionViewSet(BaseMasterViewSet):
    queryset = Division.objects.select_related('circle', 'circle__zone').all()
    serializer_class = DivisionSerializer
    filterset_fields = ['status', 'circle']
    search_fields = ['code', 'name', 'hod']
    ordering_fields = ['code', 'name']
    
    @action(detail=True, methods=['get'])
    def subdivisions(self, request, pk=None):
        """Get all subdivisions under this division"""
        division = self.get_object()
        subdivisions = division.subdivisions.all()
        serializer = SubDivisionNestedSerializer(subdivisions, many=True)
        return Response(serializer.data)


class SubDivisionViewSet(BaseMasterViewSet):
    queryset = SubDivision.objects.select_related('division', 'division__circle').all()
    serializer_class = SubDivisionSerializer
    filterset_fields = ['division']
    search_fields = ['code', 'name', 'jurisdiction_area']
    ordering_fields = ['code', 'name']


# ========== Geography ViewSets ==========

class DistrictViewSet(BaseMasterViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    filterset_fields = ['state_name']
    search_fields = ['code', 'name', 'state_name']
    ordering_fields = ['state_name', 'name']
    
    @action(detail=True, methods=['get'])
    def towns(self, request, pk=None):
        """Get all towns under this district"""
        district = self.get_object()
        towns = district.towns.all()
        serializer = TownNestedSerializer(towns, many=True)
        return Response(serializer.data)


class TownViewSet(BaseMasterViewSet):
    queryset = Town.objects.select_related('district').all()
    serializer_class = TownSerializer
    filterset_fields = ['classification', 'district']
    search_fields = ['code', 'name']
    ordering_fields = ['name']


# ========== Classification ViewSets ==========

class SchemeTypeViewSet(BaseMasterViewSet):
    queryset = SchemeType.objects.all()
    serializer_class = SchemeTypeSerializer
    filterset_fields = ['category']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name']


class SchemeViewSet(BaseMasterViewSet):
    queryset = Scheme.objects.select_related('scheme_type').all()
    serializer_class = SchemeSerializer
    filterset_fields = ['scheme_type', 'funding_agency']
    search_fields = ['code', 'name', 'funding_agency']
    ordering_fields = ['code', 'name']


class WorkTypeViewSet(BaseMasterViewSet):
    queryset = WorkType.objects.all()
    serializer_class = WorkTypeSerializer
    filterset_fields = ['sector']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name']


class ProjectCategoryViewSet(BaseMasterViewSet):
    queryset = ProjectCategory.objects.all()
    serializer_class = ProjectCategorySerializer
    search_fields = ['code', 'name']
    ordering_fields = ['threshold_value', 'code']
    
    @action(detail=False, methods=['get'])
    def suggest_category(self, request):
        """
        Auto-suggest project category based on contract value.
        
        Query params:
            contract_value: The project's contract value in INR
            
        Returns:
            Matching category based on threshold comparison.
            Categories are ordered by threshold (descending), and the first
            category where contract_value >= threshold is returned.
        """
        from decimal import Decimal
        
        contract_value = request.query_params.get('contract_value')
        if not contract_value:
            return Response({
                'error': 'contract_value query parameter is required'
            }, status=400)
        
        try:
            value = Decimal(str(contract_value))
        except:
            return Response({
                'error': 'Invalid contract_value format'
            }, status=400)
        
        # Get categories ordered by threshold descending
        # Find first category where value >= threshold
        categories = ProjectCategory.objects.order_by('-threshold_value')
        
        matched_category = None
        for category in categories:
            if value >= category.threshold_value:
                matched_category = category
                break
        
        # If no match (value less than all thresholds), use the lowest threshold category
        if not matched_category and categories.exists():
            matched_category = categories.last()  # Lowest threshold
        
        if matched_category:
            return Response({
                'suggested_category': {
                    'id': str(matched_category.id),
                    'code': matched_category.code,
                    'name': matched_category.name,
                    'threshold_value': float(matched_category.threshold_value),
                    'approval_authority': matched_category.approval_authority,
                },
                'contract_value': float(value),
                'message': f"Based on ₹{value:,.0f} contract value, suggested category is '{matched_category.name}'"
            })
        else:
            return Response({
                'suggested_category': None,
                'contract_value': float(value),
                'message': 'No project categories configured. Please add categories in Master Data.'
            })



# ========== Entity ViewSets ==========

class ContractorViewSet(BaseMasterViewSet):
    queryset = Contractor.objects.prefetch_related('bank_account_details').all()
    filterset_fields = ['contractor_type', 'registration_class', 'blacklisted']
    search_fields = ['code', 'name', 'pan', 'gstin']
    ordering_fields = ['name', 'code']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ContractorListSerializer
        return ContractorSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active (non-blacklisted, valid) contractors"""
        from django.utils import timezone
        today = timezone.now().date()
        contractors = self.queryset.filter(
            blacklisted=False
        ).filter(
            models.Q(validity_date__isnull=True) | models.Q(validity_date__gte=today)
        )
        serializer = ContractorListSerializer(contractors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active_with_accounts(self, request):
        """
        Get active contractors with linked user accounts.
        
        This endpoint is used for package creation to ensure selected contractors
        can receive notifications via email and in-app.
        
        Returns:
            List of active contractors who have linked_user accounts
        """
        from django.utils import timezone
        today = timezone.now().date()
        
        contractors = self.queryset.filter(
            blacklisted=False,
            linked_user__isnull=False  # Must have linked user account
        ).filter(
            models.Q(validity_date__isnull=True) | models.Q(validity_date__gte=today)
        ).select_related('linked_user')
        
        serializer = ContractorListSerializer(contractors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def sync_from_users(self, request):
        """
        Create Contractor master records for all EPC_Contractor users 
        who don't have a linked contractor profile.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Find EPC Contractor users with active status but no linked contractor
        epc_users = User.objects.filter(
            role='EPC_Contractor',
            account_status='ACTIVE',
            contractor_profile__isnull=True
        )
        
        created_count = 0
        linked_count = 0
        errors = []
        
        for user in epc_users:
            try:
                # Check if a contractor already exists with same PAN
                if user.pan_number:
                    existing = Contractor.objects.filter(pan=user.pan_number).first()
                    if existing:
                        existing.linked_user = user
                        existing.save()
                        linked_count += 1
                        continue
                
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
                
                # Ensure unique code
                while Contractor.objects.filter(code=code).exists():
                    next_num += 1
                    code = f"CON-{next_num:04d}"
                
                # Create contractor record
                Contractor.objects.create(
                    code=code,
                    name=user.company_name or f"{user.first_name} {user.last_name}",
                    contractor_type='Proprietorship',
                    registration_class=getattr(user, 'registration_class', '') or '',
                    pan=user.pan_number or '',
                    gstin=getattr(user, 'gstin_number', '') or '',
                    contact_person=f"{user.first_name} {user.last_name}",
                    email=user.email,
                    phone=user.phone_number or '',
                    address=getattr(user, 'full_address', '') or '',
                    blacklisted=False,
                    linked_user=user,
                )
                created_count += 1
            except Exception as e:
                errors.append(f"User {user.email}: {str(e)}")
        
        return Response({
            'message': f'Sync completed. Created {created_count} new contractors, linked {linked_count} existing.',
            'created': created_count,
            'linked': linked_count,
            'total_epc_users': epc_users.count(),
            'errors': errors if errors else None
        })


class ContractorBankAccountViewSet(BaseMasterViewSet):
    queryset = ContractorBankAccount.objects.select_related('contractor', 'bank_branch').all()
    serializer_class = ContractorBankAccountSerializer
    filterset_fields = ['contractor', 'is_primary']


# ========== Finance Config ViewSets ==========

class ETPMasterViewSet(BaseMasterViewSet):
    queryset = ETPMaster.objects.all()
    serializer_class = ETPMasterSerializer
    filterset_fields = ['charge_type', 'basis_of_calculation', 'is_active']
    search_fields = ['code', 'name', 'govt_reference']
    ordering_fields = ['charge_type', 'code', 'rate_percentage']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active ETP charges"""
        charges = ETPMaster.get_active_charges()
        serializer = self.get_serializer(charges, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def deductions(self, request):
        """Get active deduction charges"""
        charges = ETPMaster.get_active_charges(charge_type='Deduction')
        serializer = self.get_serializer(charges, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recoveries(self, request):
        """Get active recovery charges"""
        charges = ETPMaster.get_active_charges(charge_type='Recovery')
        serializer = self.get_serializer(charges, many=True)
        return Response(serializer.data)

# ========== Location ViewSets (Country -> State -> City) ==========

class CountryViewSet(BaseMasterViewSet):
    """
    Country master data ViewSet
    Currently returns India only, expandable to more countries
    Uses AllowAny for read operations (needed for contractor registration)
    """
    permission_classes = [permissions.AllowAny]
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    
    @action(detail=True, methods=['get'])
    def states(self, request, pk=None):
        """Get all states for this country"""
        country = self.get_object()
        states = country.states.filter(is_active=True)
        serializer = StateNestedSerializer(states, many=True)
        return Response(serializer.data)


class StateViewSet(BaseMasterViewSet):
    """
    State/Province master data ViewSet
    Filterable by country for cascading dropdowns
    Uses AllowAny for read operations (needed for contractor registration)
    """
    permission_classes = [permissions.AllowAny]
    queryset = State.objects.select_related('country').filter(is_active=True)
    serializer_class = StateSerializer
    filterset_fields = ['country']
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    
    @action(detail=True, methods=['get'])
    def districts(self, request, pk=None):
        """Get all districts for this state"""
        state = self.get_object()
        districts = state.location_districts.filter(is_active=True)
        serializer = LocationDistrictNestedSerializer(districts, many=True)
        return Response(serializer.data)


class LocationDistrictViewSet(BaseMasterViewSet):
    """
    District master data ViewSet (between State and City)
    Filterable by state for cascading dropdowns
    Uses AllowAny for read operations (needed for contractor registration)
    """
    permission_classes = [permissions.AllowAny]
    queryset = LocationDistrict.objects.select_related('state', 'state__country').filter(is_active=True)
    serializer_class = LocationDistrictSerializer
    filterset_fields = ['state']
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    
    @action(detail=True, methods=['get'])
    def cities(self, request, pk=None):
        """Get all cities for this district"""
        district = self.get_object()
        cities = district.cities.filter(is_active=True)
        serializer = CityNestedSerializer(cities, many=True)
        return Response(serializer.data)


class CityViewSet(BaseMasterViewSet):
    """
    City master data ViewSet
    Filterable by district (was state) for cascading dropdowns
    Uses AllowAny for read operations (needed for contractor registration)
    """
    permission_classes = [permissions.AllowAny]
    queryset = City.objects.select_related('district', 'district__state', 'district__state__country').filter(is_active=True)
    serializer_class = CitySerializer
    filterset_fields = ['district']
    search_fields = ['name', 'code']
    ordering_fields = ['name']
