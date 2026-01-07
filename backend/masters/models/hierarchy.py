"""
Hierarchy Models for Administrative Structure
Zone → Circle → Division → SubDivision
"""
from django.db import models
from django.conf import settings
import uuid


class Zone(models.Model):
    """Highest level administrative grouping"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., ZN-SOUTH")
    name = models.CharField(max_length=255, help_text="Full name of the Zone")
    state_covered = models.CharField(max_length=255, blank=True, help_text="State or region managed")
    # Legacy text field (deprecated - use head_user instead)
    head = models.CharField(max_length=255, blank=True, help_text="[Deprecated] Zonal Head name and designation")
    # New: Link to User model for proper user management
    head_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_zones',
        help_text="User account of the Zonal Head"
    )
    status = models.CharField(
        max_length=20,
        choices=[('Active', 'Active'), ('Inactive', 'Inactive')],
        default='Active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_zone'
        ordering = ['code']
        verbose_name = 'Zone'
        verbose_name_plural = 'Zones'

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def head_display(self):
        """Get head name from linked user or fallback to text field"""
        if self.head_user:
            return self.head_user.get_full_name() or self.head_user.username
        return self.head or 'Not Assigned'


class Circle(models.Model):
    """Grouping of divisions, usually headed by SE/CE"""
    AUTHORITY_CHOICES = [
        ('CE', 'Chief Engineer'),
        ('SE', 'Superintending Engineer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., C-CIVIL")
    name = models.CharField(max_length=255, help_text="Full name of the Circle")
    zone = models.ForeignKey(
        Zone,
        on_delete=models.PROTECT,
        related_name='circles',
        help_text="Parent Zone"
    )
    authority_level = models.CharField(
        max_length=5,
        choices=AUTHORITY_CHOICES,
        default='SE',
        help_text="Rank of officer heading the Circle"
    )
    status = models.CharField(
        max_length=20,
        choices=[('Active', 'Active'), ('Inactive', 'Inactive')],
        default='Active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_circle'
        ordering = ['code']
        verbose_name = 'Circle'
        verbose_name_plural = 'Circles'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Division(models.Model):
    """Operational division within a Circle"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., DIV-NGR")
    name = models.CharField(max_length=255, help_text="Full name of the Division")
    circle = models.ForeignKey(
        Circle,
        on_delete=models.PROTECT,
        related_name='divisions',
        help_text="Parent Circle"
    )
    # Legacy text field (deprecated - use hod_user instead)
    hod = models.CharField(max_length=255, blank=True, help_text="[Deprecated] Head of Division name")
    # New: Link to User model for proper user management
    hod_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_divisions',
        help_text="User account of the Head of Division"
    )
    contact_email = models.EmailField(blank=True, help_text="Official email")
    contact_phone = models.CharField(max_length=20, blank=True, help_text="Official phone")
    effective_date = models.DateField(null=True, blank=True, help_text="Date division started")
    status = models.CharField(
        max_length=20,
        choices=[('Active', 'Active'), ('Inactive', 'Inactive')],
        default='Active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_division'
        ordering = ['code']
        verbose_name = 'Division'
        verbose_name_plural = 'Divisions'

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def hod_display(self):
        """Get HOD name from linked user or fallback to text field"""
        if self.hod_user:
            return self.hod_user.get_full_name() or self.hod_user.username
        return self.hod or 'Not Assigned'


class SubDivision(models.Model):
    """Smallest administrative unit"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., SD-01-W")
    name = models.CharField(max_length=255, help_text="Full name of Sub-Division")
    division = models.ForeignKey(
        Division,
        on_delete=models.PROTECT,
        related_name='subdivisions',
        help_text="Parent Division"
    )
    jurisdiction_area = models.CharField(max_length=500, blank=True, help_text="Geographical area covered")
    # Legacy text field (deprecated - use reporting_officer_user instead)
    reporting_officer = models.CharField(max_length=255, blank=True, help_text="[Deprecated] Sub-Divisional Engineer name")
    # New: Link to User model for proper user management
    reporting_officer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_subdivisions',
        help_text="User account of the Sub-Divisional Engineer"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20,
        choices=[('Active', 'Active'), ('Inactive', 'Inactive')],
        default='Active'
    )

    class Meta:
        db_table = 'masters_subdivision'
        ordering = ['code']
        verbose_name = 'Sub-Division'
        verbose_name_plural = 'Sub-Divisions'

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def reporting_officer_display(self):
        """Get officer name from linked user or fallback to text field"""
        if self.reporting_officer_user:
            return self.reporting_officer_user.get_full_name() or self.reporting_officer_user.username
        return self.reporting_officer or 'Not Assigned'
