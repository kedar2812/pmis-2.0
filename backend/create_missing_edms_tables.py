"""
Script to create missing EDMS tables.
Run with: python create_missing_edms_tables.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# SQL statements to create missing tables
sql_statements = [
    # edms_folder
    """
    CREATE TABLE IF NOT EXISTS edms_folder (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        project_id UUID NOT NULL REFERENCES projects_project(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES edms_folder(id) ON DELETE CASCADE,
        created_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS edms_folder_project_idx ON edms_folder(project_id);
    CREATE INDEX IF NOT EXISTS edms_folder_parent_idx ON edms_folder(parent_id);
    """,
    
    # edms_approvalworkflow
    """
    CREATE TABLE IF NOT EXISTS edms_approvalworkflow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL UNIQUE REFERENCES edms_document(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
        initiated_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
        initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        deadline TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS edms_approvalworkflow_doc_idx ON edms_approvalworkflow(document_id);
    CREATE INDEX IF NOT EXISTS edms_approvalworkflow_status_idx ON edms_approvalworkflow(status);
    """,
    
    # edms_approvalstep
    """
    CREATE TABLE IF NOT EXISTS edms_approvalstep (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES edms_approvalworkflow(id) ON DELETE CASCADE,
        step_type VARCHAR(30) NOT NULL,
        step_order INTEGER NOT NULL,
        role_required VARCHAR(50) NOT NULL,
        action VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        actor_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
        acted_at TIMESTAMPTZ,
        comments TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS edms_approvalstep_workflow_idx ON edms_approvalstep(workflow_id);
    """,
    
    # edms_documentauditlog
    """
    CREATE TABLE IF NOT EXISTS edms_documentauditlog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
        actor_role VARCHAR(50) DEFAULT 'Unknown',
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent TEXT DEFAULT '',
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS edms_auditlog_actor_idx ON edms_documentauditlog(actor_id);
    CREATE INDEX IF NOT EXISTS edms_auditlog_resource_idx ON edms_documentauditlog(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS edms_auditlog_timestamp_idx ON edms_documentauditlog(timestamp);
    """,
]

# Add folder_id to edms_document if not exists
add_folder_column = """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edms_document' AND column_name='folder_id') THEN
        ALTER TABLE edms_document ADD COLUMN folder_id UUID REFERENCES edms_folder(id) ON DELETE SET NULL;
    END IF;
END $$;
"""

with connection.cursor() as cursor:
    for sql in sql_statements:
        try:
            cursor.execute(sql)
            print("Executed successfully:", sql[:50].strip().replace('\n', ' ') + "...")
        except Exception as e:
            print("Error:", e)
    
    # Add folder_id column
    try:
        cursor.execute(add_folder_column)
        print("Added folder_id column to edms_document")
    except Exception as e:
        print("Note:", e)

# Mark migration as applied
with connection.cursor() as cursor:
    cursor.execute("INSERT INTO django_migrations (app, name, applied) VALUES ('edms', '0001_initial', NOW()) ON CONFLICT DO NOTHING")
    print("Migration marked as applied")

print("\nDone! Please restart the Django server.")
