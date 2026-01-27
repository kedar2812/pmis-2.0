from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    name = 'projects'
    default_auto_field = 'django.db.models.BigAutoField'
    
    def ready(self):
        """Import signals when Django app is ready."""
        # Signals removed as part of EDMS integration revert
        pass
