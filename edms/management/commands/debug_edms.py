
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import default_storage
from edms.models import Document
import os

class Command(BaseCommand):
    help = 'Debugs EDMS file paths and database consistency'

    def handle(self, *args, **options):
        self.stdout.write("--- DIAGNOSTICS START ---")
        self.stdout.write(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
        self.stdout.write(f"MEDIA_URL: {settings.MEDIA_URL}")
        self.stdout.write(f"FileSystemStorage Location: {default_storage.location}")
        
        self.stdout.write("\n--- DATABASE vs DISK ---")
        documents = Document.objects.all()
        if not documents:
            self.stdout.write("No documents found in DB.")
            return

        for doc in documents:
            self.stdout.write(f"\nDocument ID: {doc.id}")
            self.stdout.write(f"Title: {doc.title}")
            self.stdout.write(f"Stored Key (s3_key): '{doc.s3_key}'")
            
            # Check via Storage API
            exists = default_storage.exists(doc.s3_key)
            self.stdout.write(f"Storage.exists(key): {exists}")
            
            if not exists:
                # Check manual path
                full_path = os.path.join(settings.MEDIA_ROOT, doc.s3_key)
                self.stdout.write(f"Checking full path manually: {full_path}")
                self.stdout.write(f"os.path.exists: {os.path.exists(full_path)}")
                
                # List directory
                dir_path = os.path.dirname(full_path)
                if os.path.exists(dir_path):
                    self.stdout.write(f"Contents of {dir_path}:")
                    try:
                        self.stdout.write(str(os.listdir(dir_path)))
                    except Exception as e:
                        self.stdout.write(f"Error listing dir: {e}")
                else:
                    self.stdout.write(f"Directory does not exist: {dir_path}")
        
        self.stdout.write("\n--- DIAGNOSTICS END ---")
