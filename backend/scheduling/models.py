from django.db import models
import uuid

class ScheduleTask(models.Model):
    """
    Represents a Task or Milestone in the Project Schedule (WBS).
    Finance module links strictly to these for 'No Money Without Time'.
    """
    class TaskStatus(models.TextChoices):
        PLANNED = 'PLANNED', 'Planned'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        DELAYED = 'DELAYED', 'Delayed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=255)
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    progress = models.FloatField(default=0.0, help_text="Physical Progress %")
    
    is_milestone = models.BooleanField(default=False)
    
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.PLANNED)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.progress}%)"
