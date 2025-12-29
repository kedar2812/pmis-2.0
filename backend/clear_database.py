"""
Script to completely clear the database by dropping all tables and recreating them.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.core.management import call_command

def clear_database():
    """Drop all tables and recreate them fresh."""
    with connection.cursor() as cursor:
        # Get all table names
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        tables = cursor.fetchall()
        
        if tables:
            # Disable foreign key checks
            cursor.execute("SET session_replication_role = 'replica';")
            
            # Drop all tables
            for table in tables:
                table_name = table[0]
                print(f"Dropping table: {table_name}")
                cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE;')
            
            # Re-enable foreign key checks
            cursor.execute("SET session_replication_role = 'origin';")
            
            print("\nAll tables dropped successfully!")
        else:
            print("No tables found to drop.")
    
    # Run migrations to recreate tables
    print("\nRunning migrations to recreate tables...")
    call_command('migrate', '--run-syncdb')
    print("\nDatabase reset complete! Fresh tables created.")

if __name__ == '__main__':
    print("Clearing database...")
    clear_database()
