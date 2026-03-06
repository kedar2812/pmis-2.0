from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class DailySiteLog(models.Model):
    """
    Daily Site Execution Log.
    Records physical progress achieved on a given day for a specific ScheduleTask.
    Weather data is auto-populated via Open-Meteo API during creation.
    """
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='site_logs',
        help_text='Project this execution log belongs to'
    )
    task = models.ForeignKey(
        'scheduling.ScheduleTask',
        on_delete=models.CASCADE,
        related_name='site_logs',
        help_text='ScheduleTask this execution contributes progress to'
    )

    # ========== DATE ==========
    date = models.DateField(
        auto_now_add=True,
        help_text='Date of site execution (set automatically on creation)'
    )

    # ========== EXECUTION DATA ==========
    achieved_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Quantity of work executed on this day (in the task UOM)'
    )
    remarks = models.TextField(
        blank=True,
        default='',
        help_text='Site engineer remarks, observations, or notes'
    )

    # ========== LOCATION (GPS) ==========
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='GPS latitude of site activity'
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='GPS longitude of site activity'
    )

    # ========== WEATHER (Auto-populated via Open-Meteo) ==========
    weather_temp_max = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Max temperature (°C) for the day. Auto-fetched from Open-Meteo.'
    )
    weather_temp_min = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Min temperature (°C) for the day. Auto-fetched from Open-Meteo.'
    )
    weather_rain_mm = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total precipitation (mm) for the day. Auto-fetched from Open-Meteo.'
    )

    # ========== AUDIT ==========
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='site_logs_created',
        help_text='User who submitted this log'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['project', 'date']),
            models.Index(fields=['task', 'date']),
        ]
        verbose_name = 'Daily Site Log'
        verbose_name_plural = 'Daily Site Logs'

    def __str__(self):
        return f"[{self.date}] {self.project.name} — {self.task.name} ({self.achieved_quantity})"


class SiteImage(models.Model):
    """
    Photo attached to a DailySiteLog.
    When is_primary=True, a signal auto-updates Project.latest_site_photo.
    """
    site_log = models.ForeignKey(
        DailySiteLog,
        on_delete=models.CASCADE,
        related_name='images',
        help_text='The site log this image belongs to'
    )
    image = models.ImageField(
        upload_to='execution/site_images/%Y/%m/',
        help_text='Uploaded site photograph'
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='If True, this image is synced to Project.latest_site_photo via signal'
    )
    caption = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Optional caption for the image'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-uploaded_at']
        verbose_name = 'Site Image'
        verbose_name_plural = 'Site Images'

    def __str__(self):
        return f"SiteImage({'PRIMARY' if self.is_primary else 'secondary'}) — {self.site_log}"
