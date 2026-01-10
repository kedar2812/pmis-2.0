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
python create_superuser.py

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
