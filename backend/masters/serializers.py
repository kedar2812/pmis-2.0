from rest_framework import serializers
from .models import (
    Zone, Circle, Division, SubDivision,
    District, Town,
    SchemeType, Scheme, WorkType, ProjectCategory,
    Contractor, ContractorBankAccount,
    ETPMaster,
)


# Hierarchy Serializers
class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class CircleSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    
    class Meta:
        model = Circle
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class DivisionSerializer(serializers.ModelSerializer):
    circle_name = serializers.CharField(source='circle.name', read_only=True)
    zone_name = serializers.CharField(source='circle.zone.name', read_only=True)
    
    class Meta:
        model = Division
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class SubDivisionSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source='division.name', read_only=True)
    
    class Meta:
        model = SubDivision
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# Geography Serializers
class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TownSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    
    class Meta:
        model = Town
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# Classification Serializers
class SchemeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchemeType
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class SchemeSerializer(serializers.ModelSerializer):
    scheme_type_name = serializers.CharField(source='scheme_type.name', read_only=True)
    
    class Meta:
        model = Scheme
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ProjectCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCategory
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# Entity Serializers
class ContractorBankAccountSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank_branch.bank_name', read_only=True)
    ifsc_code = serializers.CharField(source='bank_branch.ifsc_code', read_only=True)
    
    class Meta:
        model = ContractorBankAccount
        fields = ['id', 'bank_branch', 'bank_name', 'ifsc_code', 'account_number', 'account_type', 'is_primary']


class ContractorSerializer(serializers.ModelSerializer):
    bank_account_details = ContractorBankAccountSerializer(many=True, read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Contractor
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ContractorListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views with blacklist status"""
    is_valid = serializers.BooleanField(read_only=True)
    status_label = serializers.SerializerMethodField()
    
    class Meta:
        model = Contractor
        fields = ['id', 'code', 'name', 'contractor_type', 'registration_class', 
                  'blacklisted', 'blacklist_reason', 'validity_date', 'is_valid', 'status_label']
    
    def get_status_label(self, obj):
        """Return user-friendly status label for UI"""
        if obj.blacklisted:
            return 'Blacklisted'
        if not obj.is_valid:
            return 'Expired'
        return 'Active'


# Finance Config Serializers
class ETPMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ETPMaster
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# Nested/Chained Serializers for dropdowns
class CircleNestedSerializer(serializers.ModelSerializer):
    """For chained dropdown: Zone -> Circle"""
    class Meta:
        model = Circle
        fields = ['id', 'code', 'name', 'authority_level', 'status']


class DivisionNestedSerializer(serializers.ModelSerializer):
    """For chained dropdown: Circle -> Division"""
    class Meta:
        model = Division
        fields = ['id', 'code', 'name', 'hod', 'status']


class SubDivisionNestedSerializer(serializers.ModelSerializer):
    """For chained dropdown: Division -> SubDivision"""
    class Meta:
        model = SubDivision
        fields = ['id', 'code', 'name', 'jurisdiction_area']


class TownNestedSerializer(serializers.ModelSerializer):
    """For chained dropdown: District -> Town"""
    class Meta:
        model = Town
        fields = ['id', 'code', 'name', 'classification']
