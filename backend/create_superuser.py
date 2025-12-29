"""
Create initial superuser automatically if none exists.
Safe to run multiple times - only creates user if database is empty.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def create_superuser_if_needed():
    """Create superuser from environment variables if no users exist."""
    if User.objects.count() == 0:
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@pmis.local')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'changeme123')
        
        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='SPV_Official'
        )
        
        # Set additional fields after creation
        user.is_approved = True
        user.save()
        
        print(f'✓ Superuser created: {username}')
        print(f'✓ Email: {email}')
        print('✓ Please change the password after first login!')
    else:
        print(f'✓ Users already exist ({User.objects.count()} total). Skipping superuser creation.')

if __name__ == '__main__':
    create_superuser_if_needed()
