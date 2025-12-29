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

echo "Build complete!"
