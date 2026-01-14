"""
Location models for cascading country → state → district → city dropdowns
Designed for India-focused hierarchy with easy expansion to other countries

Hierarchy:
  Country (e.g., India)
    └── State (e.g., Telangana)
        └── LocationDistrict (e.g., Medak) - Named to avoid collision with masters.District
            └── City/Area (e.g., Zaheerabad)
"""
from django.db import models


class Country(models.Model):
    """
    Country Master Data
    Currently: India only
    Expandable: Add more countries by creating new records
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Country name (e.g., India)"
    )
    code = models.CharField(
        max_length=3,
        unique=True,
        help_text="ISO 3166-1 alpha-2 code (e.g., IN)"
    )
    dial_code = models.CharField(
        max_length=10,
        help_text="Country calling code (e.g., +91)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this country is active in the system"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_countries'
        verbose_name = 'Country'
        verbose_name_plural = 'Countries'
        ordering = ['name']

    def __str__(self):
        return self.name


class State(models.Model):
    """
    State/Province Master Data
    Currently: Indian states and union territories
    Expandable: Add states for new countries
    """
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='states',
        help_text="Parent country"
    )
    name = models.CharField(
        max_length=100,
        help_text="State/Province name"
    )
    code = models.CharField(
        max_length=10,
        blank=True,
        help_text="State code (e.g., TG for Telangana)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this state is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_states'
        verbose_name = 'State'
        verbose_name_plural = 'States'
        ordering = ['country', 'name']
        unique_together = [['country', 'name']]

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class LocationDistrict(models.Model):
    """
    District Master Data - Administrative district within a state
    Named LocationDistrict to avoid collision with existing masters.District
    
    In India, districts are the primary administrative division under states.
    Examples: Medak, Hyderabad, Rangareddy (in Telangana)
    """
    state = models.ForeignKey(
        State,
        on_delete=models.CASCADE,
        related_name='location_districts',
        help_text="Parent state"
    )
    name = models.CharField(
        max_length=100,
        help_text="District name"
    )
    code = models.CharField(
        max_length=10,
        blank=True,
        help_text="District code if applicable"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this district is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_location_districts'
        verbose_name = 'Location District'
        verbose_name_plural = 'Location Districts'
        ordering = ['state', 'name']
        unique_together = [['state', 'name']]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class City(models.Model):
    """
    City/Town/Area Master Data
    Now linked to LocationDistrict instead of State directly
    """
    district = models.ForeignKey(
        LocationDistrict,
        on_delete=models.CASCADE,
        related_name='cities',
        help_text="Parent district"
    )
    name = models.CharField(
        max_length=100,
        help_text="City/Town/Area name"
    )
    code = models.CharField(
        max_length=10,
        blank=True,
        help_text="City code if applicable"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this city is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_cities'
        verbose_name = 'City'
        verbose_name_plural = 'Cities'
        ordering = ['district', 'name']
        unique_together = [['district', 'name']]

    def __str__(self):
        return f"{self.name}, {self.district.name}"
