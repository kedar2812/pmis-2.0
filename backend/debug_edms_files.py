
import os
import sys
import django
from django.conf import settings
from django.core.files.storage import default_storage

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from edms.models import Document

def run_diagnostics():
    print("--- DIAGNOSTICS START ---")
    print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"MEDIA_URL: {settings.MEDIA_URL}")
    print(f"FileSystemStorage Location: {default_storage.location}")
    
    print("\n--- DATABASE vs DISK ---")
    documents = Document.objects.all()
    if not documents:
        print("No documents found in DB.")
        return

    for doc in documents:
        print(f"\nDocument ID: {doc.id}")
        print(f"Title: {doc.title}")
        print(f"Stored Key (s3_key): '{doc.s3_key}'")
        
        # Check if file exists via Storage API
        exists = default_storage.exists(doc.s3_key)
        print(f"Storage.exists(key): {exists}")
        
        if not exists:
            # check manual path
            full_path = os.path.join(settings.MEDIA_ROOT, doc.s3_key)
            print(f"Checking full path manually: {full_path}")
            print(f"os.path.exists: {os.path.exists(full_path)}")
            
            # List directory to see what IS there
            dir_path = os.path.dirname(full_path)
            if os.path.exists(dir_path):
                print(f"Contents of {dir_path}:")
                try:
                    print(os.listdir(dir_path))
                except Exception as e:
                    print(f"Error listing dir: {e}")
            else:
                print(f"Directory does not exist: {dir_path}")

    print("\n--- DIAGNOSTICS END ---")

if __name__ == "__main__":
    run_diagnostics()
