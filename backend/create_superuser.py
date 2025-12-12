import os
import django
from decouple import config

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

def create_spv_admin():
    username = 'admin'
    email = 'rajesh.kumar@spv.gov.in'
    password = 'admin'

    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser {username}...")
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='SPV_Official',
            department='SPV Administration'
        )
        print("Superuser created successfully.")
    else:
        print("Superuser already exists.")

if __name__ == "__main__":
    create_spv_admin()
