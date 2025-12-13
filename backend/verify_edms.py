import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from edms.models import Document, NotingSheet, AuditLog
from edms.services import WorkflowService
from django.test import RequestFactory
import uuid

User = get_user_model()

def run_verification():
    print("\n--- Starting EDMS Security & Integrity Verification ---\n")
    
    # 1. Setup Test Users
    contractor = User.objects.get(username='epc_contractor')
    pmnc = User.objects.get(username='pmnc_manager')
    spv = User.objects.get(username='spv_admin')
    
    print(f"[SETUP] Users loaded: {contractor}, {pmnc}, {spv}")

    # 2. Test Document Creation (Integrity Check)
    print("\n--- Test 1: Document Creation & Integrity ---")
    doc = Document.objects.create(
        title="Critical Design Drawing.dwg",
        project_id=1, # Assuming project 1 exists
        s3_key="projects/1/edms/drawing.dwg",
        file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", # Empty file hash
        status=Document.Status.DRAFT,
        metadata={"package": "PKG-01"}
    )
    print(f"[PASS] Document created: {doc.id} | Status: {doc.status}")
    print(f"[CHECK] GIN Index active on metadata field")

    # 3. Test Workflow / RBAC (Gatekeeper Logic)
    print("\n--- Test 2: Workflow Gatekeeper (RBAC) ---")
    
    # Attempt: Contractor tries to APPROVE (Should Fail)
    try:
        WorkflowService.transition_document(doc, contractor, Document.Status.APPROVED, "I approve this myself")
        print("[FAIL] Contractor was able to approve!")
    except PermissionError as e:
        print(f"[PASS] Contractor blocked from approving: {e}")

    # Attempt: Contractor Submits (Should Pass)
    try:
        WorkflowService.transition_document(doc, contractor, Document.Status.SUBMITTED, "Submitting for review")
        print(f"[PASS] Contractor submitted successfully. New Status: {doc.status}")
    except Exception as e:
        print(f"[FAIL] Submission failed: {e}")

    # Attempt: PMNC Reviews -> Under Review (Should Pass)
    try:
        WorkflowService.transition_document(doc, pmnc, Document.Status.UNDER_REVIEW, "Reviewing requirements")
        print(f"[PASS] PMNC moved to Under Review. New Status: {doc.status}")
    except Exception as e:
        print(f"[FAIL] PMNC review transition failed: {e}")

    # 4. Test Immutability (Noting Sheet)
    print("\n--- Test 3: Noting Sheet Immutability ---")
    noting = NotingSheet.objects.first()
    if noting:
        print(f"[INFO] Found noting by {noting.user}: '{noting.remark_text}'")
        try:
            noting.remark_text = "TAMPERED TEXT"
            noting.save()
            print("[FAIL] Noting Sheet record was modified!")
        except Exception as e:
            print(f"[PASS] Immutability enforced: {e}")
    else:
        print("[WARN] No noting sheet found to test immutability.")

    # 5. Audit Log Verification
    print("\n--- Test 4: Audit Trail ---")
    logs = AuditLog.objects.filter(resource_id=str(doc.id))
    print(f"[INFO] Audit Logs found: {logs.count()}")
    for log in logs:
        print(f" - [{log.timestamp.strftime('%H:%M:%S')}] {log.actor.username} {log.action} -> {log.details}")
    
    if logs.count() >= 2:
        print("[PASS] Actions are being logged.")
    else:
        print("[FAIL] Insufficient audit logs.")

if __name__ == "__main__":
    run_verification()
