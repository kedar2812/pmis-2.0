from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Clear manager field from projects before migration'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # First, drop the NOT NULL constraint
            cursor.execute("ALTER TABLE projects_project ALTER COLUMN manager DROP NOT NULL")
            self.stdout.write(self.style.SUCCESS('Dropped NOT NULL constraint on manager field'))
            
            # Now clear the data
            cursor.execute("UPDATE projects_project SET manager = NULL WHERE manager IS NOT NULL")
            rows_updated = cursor.rowcount
            self.stdout.write(
                self.style.SUCCESS(f'Successfully cleared manager field from {rows_updated} projects')
            )
