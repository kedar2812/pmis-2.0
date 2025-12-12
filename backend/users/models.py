from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Roles(models.TextChoices):
        SPV_OFFICIAL = 'SPV_Official', 'SPV Official'
        PMNC_TEAM = 'PMNC_Team', 'PMNC Team'
        EPC_CONTRACTOR = 'EPC_Contractor', 'EPC Contractor'
        CONSULTANT_DESIGN = 'Consultant_Design', 'Design Consultant'
        GOVT_DEPARTMENT = 'Govt_Department', 'Government Department'
        NICDC_HQ = 'NICDC_HQ', 'NICDC HQ'

    role = models.CharField(
        max_length=50,
        choices=Roles.choices,
        default=Roles.SPV_OFFICIAL,
        help_text="Designates the functional role of the user."
    )
    
    contractor_id = models.CharField(max_length=100, blank=True, null=True, help_text="Link to Contractor Profile if applicable")
    department = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
