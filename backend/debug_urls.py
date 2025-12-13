
import os
import django
from django.urls import reverse
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from edms.models import Document

def check_url():
    try:
        # Get a doc to use its ID
        doc = Document.objects.first()
        if not doc:
            print("No documents found to test.")
        
        # Try to reverse the 'preview' action
        # The viewset is likely registered as 'document' or 'documents' base name.
        # usually 'basename-action'
        
        # Assuming router.register('documents', DocumentViewSet) -> name='document-preview' or 'documents-preview'?
        # DRF default basename is model name lowercase if not specified? 
        
        print("Attempting to deduce URL name...")
        
        try:
             url = reverse('document-preview', kwargs={'pk': doc.id})
             print(f"Found URL details (document-preview): {url}")
        except Exception as e:
            print(f"Tried 'document-preview': {e}")

        try:
             url = reverse('documents-preview', kwargs={'pk': doc.id}) # If basename was manually set
             print(f"Found URL details (documents-preview): {url}")
        except Exception as e:
            print(f"Tried 'documents-preview': {e}")
            
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    check_url()
