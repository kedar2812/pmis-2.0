import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from edms.models import Document, NotingSheet
from rest_framework.test import APIClient

User = get_user_model()
admin = User.objects.get(username='admin')

# Get any document
doc = Document.objects.first()
if not doc:
    print("No documents found")
    sys.exit()

client = APIClient()
client.force_authenticate(user=admin)

payload = {
    "document": str(doc.id),
    "note_type": "GENERAL",
    "subject": "Test Note",
    "content": "Test Content",
    "references_note": None,
    "ruling_action": "NONE",
    "is_draft": True
}

response = client.post('/api/edms/noting-sheets/', payload, format='json')
print(f"Status: {response.status_code}")
if response.status_code == 500:
    import re
    match = re.search(r'<title>(.*?)</title>', response.content.decode())
    print("Exception title:", match.group(1) if match else "None")
    
    # Try getting the traceback exception block
    exc_match = re.search(r'<textarea id="traceback_area".*?>(.*?)</textarea>', response.content.decode(), re.DOTALL)
    if exc_match:
        print("Traceback:")
        print(exc_match.group(1).replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>'))
else:
    print(f"Response: {response.content.decode()}")

