import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'edms_%'")
tables = [r[0] for r in cursor.fetchall()]
print("EDMS tables in database:", tables)

expected = ['edms_folder', 'edms_document', 'edms_documentversion', 'edms_approvalworkflow', 'edms_approvalstep', 'edms_documentauditlog']
missing = [t for t in expected if t not in tables]
print("Missing tables:", missing)
