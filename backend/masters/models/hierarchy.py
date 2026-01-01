"""
Hierarchy Models for Administrative Structure
Zone → Circle → Division → SubDivision
"""
from django.db import models
import uuid


class Zone(models.Model):
    """Highest level administrative grouping"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., ZN-SOUTH")
    name = models.CharField(max_length=255, help_text="Full name of the Zone")
    state_covered = models.CharField(max_length=255, blank=True, help_text="State or region managed")
    head = models.CharField(max_length=255, blank=True, help_text="Zonal Head name and designation")
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
    hod = models.CharField(max_length=255, blank=True, help_text="Head of Division name")
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
    reporting_officer = models.CharField(max_length=255, blank=True, help_text="Sub-Divisional Engineer name")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_subdivision'
        ordering = ['code']
        verbose_name = 'Sub-Division'
        verbose_name_plural = 'Sub-Divisions'

    def __str__(self):
        return f"{self.code} - {self.name}"
