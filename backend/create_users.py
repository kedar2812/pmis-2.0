import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users_data = [
    {
        'username': 'spv_admin',
        'email': 'admin@spv.gov.in',
        'password': 'password123',
        'role': 'SPV_Official',
        'first_name': 'Rajesh',
        'last_name': 'Kumar',
        'department': 'Administration'
    },
    {
        'username': 'pmnc_manager',
        'email': 'manager@pmnc.com',
        'password': 'password123',
        'role': 'PMNC_Team',
        'first_name': 'Sarah',
        'last_name': 'Johnson',
        'department': 'Project Management'
    },
    {
        'username': 'epc_contractor',
        'email': 'contact@buildcorp.com',
        'password': 'password123',
        'role': 'EPC_Contractor',
        'first_name': 'Vikram',
        'last_name': 'Singh',
        'department': 'Construction',
        'contractor_id': 'CON-001'
    },
    {
        'username': 'design_consultant',
        'email': 'lead@designstudio.com',
        'password': 'password123',
        'role': 'Consultant_Design',
        'first_name': 'Arun',
        'last_name': 'Patel',
        'department': 'Architecture'
    },
    {
        'username': 'plumbing_contractor',
        'email': 'info@pipeline.com',
        'password': 'password123',
        'role': 'EPC_Contractor',
        'first_name': 'Suresh',
        'last_name': 'Reddy',
        'department': 'Plumbing',
        'contractor_id': 'CON-002'
    },
    {
        'username': 'govt_official',
        'email': 'director@industries.gov.in',
        'password': 'password123',
        'role': 'Govt_Department',
        'first_name': 'Priya',
        'last_name': 'IAS',
        'department': 'Ministry of Industries'
    },
    {
        'username': 'nicdc_head',
        'email': 'hq@nicdc.in',
        'password': 'password123',
        'role': 'NICDC_HQ',
        'first_name': 'Amitabh',
        'last_name': 'Kant',
        'department': 'Headquarters'
    }
]

def create_users():
    print("Creating Test Users...")
    for data in users_data:
        if not User.objects.filter(username=data['username']).exists():
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                role=data['role'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                department=data['department'],
                contractor_id=data.get('contractor_id')
            )
            print(f"[CREATED] {user.username} - {user.get_role_display()}")
        else:
            print(f"[EXISTS] {data['username']}")

    print("\nDone! Use password 'password123' for all accounts.")

if __name__ == "__main__":
    create_users()
