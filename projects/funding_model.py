from django.db import models
import uuid


class FundingSource(models.Model):
    """
    Tracks funding sources/patterns for projects.
    Previously this data was sent from frontend but discarded by backend.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='fundings'
    )
    source = models.CharField(max_length=255, help_text="Funding source name/type")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    document = models.FileField(
        upload_to='projects/funding_docs/%Y/%m/',
        null=True,
        blank=True,
        help_text="Supporting document for this funding source"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.source}: ₹{self.amount} ({self.project.name})"
