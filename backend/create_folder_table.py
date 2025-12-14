"""
Create edms_folder table with bigint project_id
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Create edms_folder with bigint project_id
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS edms_folder (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        project_id BIGINT NOT NULL REFERENCES projects_project(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES edms_folder(id) ON DELETE CASCADE,
        created_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)
    print("Created edms_folder table")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS edms_folder_project_idx ON edms_folder(project_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS edms_folder_parent_idx ON edms_folder(parent_id);")
    print("Created indexes")
    
    # Add folder_id to edms_document
    cursor.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edms_document' AND column_name='folder_id') THEN
            ALTER TABLE edms_document ADD COLUMN folder_id UUID REFERENCES edms_folder(id) ON DELETE SET NULL;
        END IF;
    END $$;
    """)
    print("Added folder_id column to edms_document")

print("Done!")
