#!/usr/bin/env bash
# Render build script for Django backend
# Use 'set -e' only for critical steps, allow optional steps to fail gracefully

echo "=========================================="
echo "PMIS Backend Build Script"
echo "=========================================="

echo ""
echo "Step 1/6: Installing dependencies..."
pip install -r requirements.txt || { echo "ERROR: Failed to install dependencies"; exit 1; }

echo ""
echo "Step 2/6: Collecting static files..."
python manage.py collectstatic --no-input || echo "WARNING: collectstatic had issues (continuing anyway)"

echo ""
echo "Step 3/6: Running database migrations..."
python manage.py migrate || { echo "ERROR: Migrations failed"; exit 1; }

echo ""
echo "Step 4/6: Creating superuser if needed..."
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
" || echo "WARNING: Superuser step had issues (continuing anyway)"

echo ""
echo "Step 5/6: Checking and importing bank data..."
# Use tail -1 to get only the last line (the actual count), ignoring Django's auto-import messages
BANK_COUNT=$(python manage.py shell -c "from banks.models import BankBranch; print(BankBranch.objects.count())" 2>/dev/null | tail -1 | tr -d '[:space:]')
echo "Current bank count: $BANK_COUNT"

if [ "$BANK_COUNT" = "0" ] || [ -z "$BANK_COUNT" ] || ! [[ "$BANK_COUNT" =~ ^[0-9]+$ ]]; then
    echo "No bank data found. Starting import..."
    
    echo "Downloading Razorpay IFSC data..."
    if git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc; then
        echo "Importing bank data (this may take 30-60 seconds)..."
        python manage.py import_razorpay_ifsc --data-dir temp_razorpay_ifsc/src || echo "WARNING: Bank import had issues"
        
        echo "Cleaning up..."
        rm -rf temp_razorpay_ifsc
        
        # Verify import
        FINAL_COUNT=$(python manage.py shell -c "from banks.models import BankBranch; print(BankBranch.objects.count())" 2>/dev/null || echo "0")
        echo "Bank data import complete! Total branches: $FINAL_COUNT"
    else
        echo "WARNING: Could not clone IFSC repository (continuing anyway)"
    fi
else
    echo "Bank data already exists: $BANK_COUNT branches"
fi

echo ""
echo "Step 6/6: Checking and importing location data..."
# Use tail -1 to get only the last line (the actual count)
COUNTRY_COUNT=$(python manage.py shell -c "from masters.models import Country; print(Country.objects.count())" 2>/dev/null | tail -1 | tr -d '[:space:]')
echo "Current country count: $COUNTRY_COUNT"

if [ "$COUNTRY_COUNT" = "0" ] || [ -z "$COUNTRY_COUNT" ] || ! [[ "$COUNTRY_COUNT" =~ ^[0-9]+$ ]]; then
    echo "No location data found. Importing India locations..."
    python manage.py populate_india_locations || echo "WARNING: Location import had issues"
    echo "Location data import complete!"
else
    echo "Location data already exists: $COUNTRY_COUNT countries"
fi

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
