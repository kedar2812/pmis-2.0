from django.apps import AppConfig


class ExecutionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'execution'
    verbose_name = 'Site Execution'

    def ready(self):
        import execution.signals  # noqa: F401 — connect signals on startup
