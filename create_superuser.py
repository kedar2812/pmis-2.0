#!/usr/bin/env python
"""
Create superuser from environment variables if it doesn't exist.
Used during Render deployment to ensure admin access.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Get credentials from environment variables
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@pmis.gov.in')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')

if not password:
    print("DJANGO_SUPERUSER_PASSWORD not set. Skipping superuser creation.")
else:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            first_name='System',
            last_name='Admin'
        )
        print(f"Superuser created: {email}")
    else:
        print(f"Superuser already exists: {email}")
