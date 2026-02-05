from django.apps import AppConfig


class WorkflowConfig(AppConfig):
    name = 'workflow'
    default_auto_field = 'django.db.models.BigAutoField'
    
    def ready(self):
        """Connect workflow signals when app is ready."""
        from . import signals
        signals.connect_signals()
