from django.db import models


class Project(models.Model):
    """
    Core Project model with references to Master Data tables.
    
    Uses ForeignKey with SET_NULL to maintain data integrity while allowing
    flexibility when master records are deleted or not yet assigned.
    """
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
        ('Under Review', 'Under Review'),
    ]

    # Basic Information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Planning')
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    progress = models.FloatField(default=0.0)
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # ========== HIERARCHY (Master References) ==========
    zone = models.ForeignKey(
        'masters.Zone', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative zone'
    )
    circle = models.ForeignKey(
        'masters.Circle', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative circle'
    )
    division = models.ForeignKey(
        'masters.Division', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative division'
    )
    sub_division = models.ForeignKey(
        'masters.SubDivision', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Administrative sub-division'
    )
    
    # ========== GEOGRAPHY (Master References) ==========
    district = models.ForeignKey(
        'masters.District', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project district'
    )
    town = models.ForeignKey(
        'masters.Town', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project town/city'
    )
    
    # ========== CLASSIFICATION (Master References) ==========
    scheme_type = models.ForeignKey(
        'masters.SchemeType', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Type of scheme'
    )
    scheme = models.ForeignKey(
        'masters.Scheme', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Specific scheme'
    )
    work_type = models.ForeignKey(
        'masters.WorkType', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Type of work'
    )
    project_category = models.ForeignKey(
        'masters.ProjectCategory', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='projects',
        help_text='Project category classification'
    )
    
    # ========== LOCATION (Legacy + Map) ==========
    lat = models.FloatField(null=True, blank=True, help_text='Latitude for map display')
    lng = models.FloatField(null=True, blank=True, help_text='Longitude for map display')
    address = models.CharField(max_length=500, blank=True, help_text='Physical address or landmark')
    
    # ========== METADATA ==========
    manager = models.CharField(max_length=255, blank=True)
    stakeholders = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=100, blank=True, help_text='Legacy category field')
    land_acquisition_status = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name
    
    @property
    def hierarchy_display(self):
        """Returns a formatted string of the administrative hierarchy."""
        parts = []
        if self.zone:
            parts.append(self.zone.name)
        if self.circle:
            parts.append(self.circle.name)
        if self.division:
            parts.append(self.division.name)
        return ' → '.join(parts) if parts else 'Not assigned'
    
    @property
    def location_display(self):
        """Returns a formatted location string."""
        parts = []
        if self.town:
            parts.append(self.town.name)
        if self.district:
            parts.append(self.district.name)
        return ', '.join(parts) if parts else self.address or 'Not specified'


class WorkPackage(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='work_packages')
    contractor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_packages')
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')
    
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Agreement Details
    agreement_no = models.CharField(max_length=100, blank=True, null=True)
    agreement_date = models.DateField(null=True, blank=True)
    responsible_staff = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.project.name})"
