"""
Geography Models for Location Data
District → Town
"""
from django.db import models
import uuid


class District(models.Model):
    """Geographical district classification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., D-410")
    name = models.CharField(max_length=255, help_text="Official district name")
    state_name = models.CharField(max_length=100, help_text="State the district belongs to")
    pincode_range = models.CharField(max_length=100, blank=True, help_text="e.g., 560001 to 560099")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_district'
        ordering = ['state_name', 'name']
        verbose_name = 'District'
        verbose_name_plural = 'Districts'

    def __str__(self):
        return f"{self.code} - {self.name}, {self.state_name}"


class Town(models.Model):
    """Town/City within a District"""
    CLASSIFICATION_CHOICES = [
        ('Metropolitan', 'Metropolitan'),
        ('Municipality', 'Municipality'),
        ('Town', 'Town'),
        ('Village', 'Village'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g., T-0010")
    name = models.CharField(max_length=255, help_text="Official town/city name")
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name='towns',
        help_text="Parent District"
    )
    classification = models.CharField(
        max_length=20,
        choices=CLASSIFICATION_CHOICES,
        default='Town'
    )
    population = models.PositiveIntegerField(null=True, blank=True, help_text="Estimated population")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'masters_town'
        ordering = ['name']
        verbose_name = 'Town/City'
        verbose_name_plural = 'Towns/Cities'

    def __str__(self):
        return f"{self.code} - {self.name}"
