#!/usr/bin/env bash
# Render build script for Django backend
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running database migrations..."
python manage.py migrate

echo "Creating superuser if needed..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@pmis.gov.in')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
if not password:
    print('DJANGO_SUPERUSER_PASSWORD not set. Skipping superuser creation.')
elif User.objects.filter(email=email).exists():
    print(f'Superuser already exists: {email}')
else:
    User.objects.create_superuser(email=email, username=username, password=password, first_name='System', last_name='Admin')
    print(f'Superuser created: {email}')
"

echo "Checking bank data..."
# Check if bank data exists, if not import it automatically
python manage.py shell -c "
from banks.models import BankBranch
if BankBranch.objects.count() == 0:
    print('No bank data found. Import needed.')
    exit(1)
else:
    print(f'Bank data already exists: {BankBranch.objects.count()} branches')
    exit(0)
" || {
    echo "Downloading Razorpay IFSC data..."
    git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc
    
    echo "Importing bank data (this will take ~10 seconds)..."
    python manage.py import_razorpay_ifsc --data-dir temp_razorpay_ifsc/src
    
    echo "Cleaning up..."
    rm -rf temp_razorpay_ifsc
    
    echo "Bank data import complete!"
}

echo "Checking location data..."
# Check if location data exists, if not import India locations
python manage.py shell -c "
from masters.models import Country
if Country.objects.count() == 0:
    print('No location data found. Import needed.')
    exit(1)
else:
    print(f'Location data already exists: {Country.objects.count()} countries')
    exit(0)
" || {
    echo "Importing India location data..."
    python manage.py populate_india_locations
    echo "Location data import complete!"
}

echo "Build complete!"
