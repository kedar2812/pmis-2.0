"""
Reset admin password to 'admin'
Run this in Render Shell: python reset_admin_password.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def reset_admin_password():
    """Reset admin user password to 'admin'"""
    try:
        admin_user = User.objects.get(username='admin')
        admin_user.set_password('admin')
        admin_user.save()
        print('✅ Success! Admin password has been reset to: admin')
        print('You can now login with:')
        print('  Username: admin')
        print('  Password: admin')
    except User.DoesNotExist:
        print('❌ Admin user does not exist. Creating one...')
        User.objects.create_superuser(
            username='admin',
            email='admin@pmis.local',
            password='admin',
            role='SPV_Official',
            is_approved=True
        )
        print('✅ Admin user created!')
        print('  Username: admin')
        print('  Password: admin')

if __name__ == '__main__':
    reset_admin_password()
