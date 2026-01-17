@echo off
cd /d "C:\Users\desal\OneDrive\Desktop\projects kedar\pmis-2.0-main\backend"
call venv\Scripts\activate.bat
python manage.py runserver 0.0.0.0:8000
