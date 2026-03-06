from django.contrib import admin
from .models import DailySiteLog, SiteImage


class SiteImageInline(admin.TabularInline):
    model = SiteImage
    extra = 1
    fields = ['image', 'is_primary', 'caption', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(DailySiteLog)
class DailySiteLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'date', 'project', 'task', 'achieved_quantity',
        'weather_temp_max', 'weather_rain_mm', 'created_by', 'created_at'
    ]
    list_filter = ['date', 'project', 'task']
    search_fields = ['project__name', 'task__name', 'remarks']
    readonly_fields = [
        'date', 'weather_temp_max', 'weather_temp_min',
        'weather_rain_mm', 'created_by', 'created_at', 'updated_at'
    ]
    inlines = [SiteImageInline]

    fieldsets = (
        ('Core Info', {
            'fields': ('project', 'task', 'date', 'achieved_quantity', 'remarks')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Weather (Auto-populated)', {
            'fields': ('weather_temp_max', 'weather_temp_min', 'weather_rain_mm'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SiteImage)
class SiteImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'site_log', 'is_primary', 'caption', 'uploaded_at']
    list_filter = ['is_primary']
    search_fields = ['site_log__project__name', 'caption']
    readonly_fields = ['uploaded_at']
