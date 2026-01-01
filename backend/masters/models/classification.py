"""
Classification Models for Project Categorization
SchemeType → Scheme, WorkType, ProjectCategory
"""
from django.db import models
import uuid


class SchemeType(models.Model):
    """Classification of funding schemes"""
    CATEGORY_CHOICES = [
        ('Infrastructure', 'Infrastructure'),
        ('Social Sector', 'Social Sector'),
        ('Education', 'Education'),
        ('Health', 'Health'),
        ('Agriculture', 'Agriculture'),
        ('Other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., ST-CS")
    name = models.CharField(max_length=255, help_text="e.g., Centrally Sponsored")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Infrastructure')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_scheme_type'
        ordering = ['code']
        verbose_name = 'Scheme Type'
        verbose_name_plural = 'Scheme Types'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Scheme(models.Model):
    """Government funding programs/schemes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., PMSGY")
    name = models.CharField(max_length=500, help_text="Full legal name of the program")
    scheme_type = models.ForeignKey(
        SchemeType,
        on_delete=models.PROTECT,
        related_name='schemes',
        help_text="Scheme classification"
    )
    funding_agency = models.CharField(max_length=255, blank=True, help_text="Central Govt/State Govt/World Bank")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget_head_code = models.CharField(max_length=50, blank=True, help_text="Budgetary ledger code")
    objective = models.TextField(blank=True, help_text="Brief goal or purpose")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_scheme'
        ordering = ['code']
        verbose_name = 'Scheme'
        verbose_name_plural = 'Schemes'

    def __str__(self):
        return f"{self.code} - {self.name}"


class WorkType(models.Model):
    """Type of construction/engineering work"""
    SECTOR_CHOICES = [
        ('PWD', 'Public Works Department'),
        ('Irrigation', 'Irrigation'),
        ('Health', 'Health'),
        ('Education', 'Education'),
        ('Roads', 'Roads & Highways'),
        ('Water Supply', 'Water Supply'),
        ('Other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., WT-ROAD")
    name = models.CharField(max_length=255, help_text="e.g., New Road Construction")
    sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, default='PWD')
    unit_of_measurement = models.CharField(max_length=50, blank=True, help_text="Km/Sq.m/Meters")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_work_type'
        ordering = ['code']
        verbose_name = 'Work Type'
        verbose_name_plural = 'Work Types'

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProjectCategory(models.Model):
    """Project size/administrative category for approval workflows"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., PC-MAJ")
    name = models.CharField(max_length=255, help_text="e.g., Major Project")
    threshold_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Minimum contract value in INR"
    )
    approval_authority = models.CharField(max_length=255, blank=True, help_text="e.g., Chief Engineer/Cabinet")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_project_category'
        ordering = ['threshold_value']
        verbose_name = 'Project Category'
        verbose_name_plural = 'Project Categories'

    def __str__(self):
        return f"{self.code} - {self.name}"
