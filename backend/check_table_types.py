"""
Check table structures
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Check projects_project id type
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='projects_project'")
    print("projects_project columns:")
    for r in cursor.fetchall():
        print(f"  {r[0]}: {r[1]}")
    
    print("\nedms_document columns:")
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='edms_document'")
    for r in cursor.fetchall():
        print(f"  {r[0]}: {r[1]}")
