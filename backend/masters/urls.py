from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ZoneViewSet, CircleViewSet, DivisionViewSet, SubDivisionViewSet,
    DistrictViewSet, TownViewSet,
    SchemeTypeViewSet, SchemeViewSet, WorkTypeViewSet, ProjectCategoryViewSet,
    ContractorViewSet, ContractorBankAccountViewSet,
    ETPMasterViewSet,
    ETPMasterViewSet,
    CountryViewSet, StateViewSet, LocationDistrictViewSet, CityViewSet,
)

router = DefaultRouter()

# Hierarchy
router.register(r'zones', ZoneViewSet, basename='zone')
router.register(r'circles', CircleViewSet, basename='circle')
router.register(r'divisions', DivisionViewSet, basename='division')
router.register(r'subdivisions', SubDivisionViewSet, basename='subdivision')

# Geography
router.register(r'districts', DistrictViewSet, basename='district')
router.register(r'towns', TownViewSet, basename='town')

# Classification
router.register(r'scheme-types', SchemeTypeViewSet, basename='scheme-type')
router.register(r'schemes', SchemeViewSet, basename='scheme')
router.register(r'work-types', WorkTypeViewSet, basename='work-type')
router.register(r'project-categories', ProjectCategoryViewSet, basename='project-category')

# Entities
router.register(r'contractors', ContractorViewSet, basename='contractor')
router.register(r'contractor-bank-accounts', ContractorBankAccountViewSet, basename='contractor-bank-account')

# Finance Config
router.register(r'etp-charges', ETPMasterViewSet, basename='etp-charge')

# Locations (Country -> State -> District -> City)
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'states', StateViewSet, basename='state')
router.register(r'location-districts', LocationDistrictViewSet, basename='location-district')
router.register(r'cities', CityViewSet, basename='city')

urlpatterns = [
    path('', include(router.urls)),
]
