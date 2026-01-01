from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Zone, Circle, Division, SubDivision,
    District, Town,
    SchemeType, Scheme, WorkType, ProjectCategory,
    Contractor, ContractorBankAccount,
    ETPMaster,
)
from .serializers import (
    ZoneSerializer, CircleSerializer, DivisionSerializer, SubDivisionSerializer,
    DistrictSerializer, TownSerializer,
    SchemeTypeSerializer, SchemeSerializer, WorkTypeSerializer, ProjectCategorySerializer,
    ContractorSerializer, ContractorListSerializer, ContractorBankAccountSerializer,
    ETPMasterSerializer,
    CircleNestedSerializer, DivisionNestedSerializer, SubDivisionNestedSerializer, TownNestedSerializer,
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
