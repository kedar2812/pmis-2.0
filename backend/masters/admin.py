from django.contrib import admin
from .models import (
    Zone, Circle, Division, SubDivision,
    District, Town,
    SchemeType, Scheme, WorkType, ProjectCategory,
    Contractor, ContractorBankAccount,
    ETPMaster,
)


# Hierarchy Admin
@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'state_covered', 'head', 'status')
    list_filter = ('status',)
    search_fields = ('code', 'name', 'state_covered')
    ordering = ('code',)


@admin.register(Circle)
class CircleAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'zone', 'authority_level', 'status')
    list_filter = ('status', 'authority_level', 'zone')
    search_fields = ('code', 'name')
    ordering = ('code',)
    autocomplete_fields = ['zone']


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'circle', 'hod', 'status')
    list_filter = ('status', 'circle__zone')
    search_fields = ('code', 'name', 'hod')
    ordering = ('code',)
    autocomplete_fields = ['circle']


@admin.register(SubDivision)
class SubDivisionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'division', 'reporting_officer')
    list_filter = ('division__circle__zone',)
    search_fields = ('code', 'name', 'jurisdiction_area')
    ordering = ('code',)
    autocomplete_fields = ['division']


# Geography Admin
@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'state_name', 'pincode_range')
    list_filter = ('state_name',)
    search_fields = ('code', 'name', 'state_name')
    ordering = ('state_name', 'name')


@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'district', 'classification', 'population')
    list_filter = ('classification', 'district__state_name')
    search_fields = ('code', 'name')
    ordering = ('name',)
    autocomplete_fields = ['district']


# Classification Admin
@admin.register(SchemeType)
class SchemeTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category')
    list_filter = ('category',)
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(Scheme)
class SchemeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'scheme_type', 'funding_agency', 'start_date', 'end_date')
    list_filter = ('scheme_type', 'funding_agency')
    search_fields = ('code', 'name')
    ordering = ('code',)
    autocomplete_fields = ['scheme_type']


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'sector', 'unit_of_measurement')
    list_filter = ('sector',)
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(ProjectCategory)
class ProjectCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'threshold_value', 'approval_authority')
    search_fields = ('code', 'name')
    ordering = ('threshold_value',)


# Entity Admin
class ContractorBankAccountInline(admin.TabularInline):
    model = ContractorBankAccount
    extra = 1
    autocomplete_fields = ['bank_branch']


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'contractor_type', 'registration_class', 'pan', 'blacklisted', 'validity_date')
    list_filter = ('contractor_type', 'registration_class', 'blacklisted')
    search_fields = ('code', 'name', 'pan', 'gstin')
    ordering = ('name',)
    inlines = [ContractorBankAccountInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'contractor_type', 'registration_class', 'registration_number')
        }),
        ('Tax Details', {
            'fields': ('pan', 'gstin', 'tds_rate')
        }),
        ('Contact', {
            'fields': ('contact_person', 'email', 'phone', 'address')
        }),
        ('Status', {
            'fields': ('blacklisted', 'blacklist_reason', 'validity_date')
        }),
    )


# ETP Admin
@admin.register(ETPMaster)
class ETPMasterAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'charge_type', 'rate_percentage', 'basis_of_calculation', 'effective_date', 'is_active')
    list_filter = ('charge_type', 'basis_of_calculation', 'is_active')
    search_fields = ('code', 'name', 'govt_reference')
    ordering = ('charge_type', 'code')
    
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'name', 'charge_type')
        }),
        ('Rate Configuration', {
            'fields': ('rate_percentage', 'basis_of_calculation')
        }),
        ('Policy Reference', {
            'fields': ('effective_date', 'govt_reference', 'account_head')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
