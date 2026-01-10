from django.apps import AppConfig


class SchedulingConfig(AppConfig):
    name = 'scheduling'
    
    def ready(self):
        """
        Import signals when the app is ready.
        
        This ensures signal handlers are registered when Django starts.
        The import statement connects the signals defined in signals.py.
        """
        import scheduling.signals  # noqa: F401
