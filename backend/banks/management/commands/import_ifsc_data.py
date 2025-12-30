"""
Management command to import IFSC data from Razorpay GitHub repository
Makes it easy for customers to update bank data quarterly or as needed
"""
import json
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch


class Command(BaseCommand):
    help = 'Import IFSC master data from Razorpay GitHub JSON files'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir',
            type=str,
            default='temp_ifsc_data/src',
            help='Directory containing IFSC JSON files (banks.json, banknames.json)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
        )
    
    def handle(self, *args, **options):
        data_dir = options['data_dir']
        clear_existing = options['clear']
        
        # File paths
        banks_file = os.path.join(data_dir, 'banks.json')
        banknames_file = os.path.join(data_dir, 'banknames.json')
        
        # Verify files exist
        if not os.path.exists(banks_file):
            self.stdout.write(self.style.ERROR(f'banks.json not found in {data_dir}'))
            return
        
        if not os.path.exists(banknames_file):
            self.stdout.write(self.style.ERROR(f'banknames.json not found in {data_dir}'))
            return
        
        # Load data
        self.stdout.write('Loading IFSC data...')
        with open(banks_file, 'r') as f:
            banks = json.load(f)
        
        with open(banknames_file, 'r') as f:
            banknames = json.load(f)
        
        self.stdout.write(f'Loaded {len(banks)} bank branches')
        
        # Clear existing data if requested
        if clear_existing:
            self.stdout.write('Clearing existing data...')
            deleted_count = BankBranch.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'Deleted {deleted_count} existing records'))
        
        # Import data
        self.stdout.write('Importing bank branches...')
        count = 0
        errors = 0
        batch = []
        batch_size = 1000
        
        for ifsc_code, branch_data in banks.items():
            try:
                # Get bank name from bank code
                bank_code = branch_data.get('code', '')
                bank_name = banknames.get(bank_code, 'Unknown Bank')
                
                # Create branch record
                branch = BankBranch(
                    ifsc_code=ifsc_code,
                    bank_name=bank_name,
                    branch_name=branch_data.get('branch', ''),
                    address=branch_data.get('address', ''),
                    city=branch_data.get('city', ''),
                    district=branch_data.get('district', ''),
                    state=branch_data.get('state', ''),
                    contact=branch_data.get('contact', ''),
                    rtgs=branch_data.get('rtgs', True),
                    neft=branch_data.get('neft', True),
                    imps=branch_data.get('imps', True),
                    upi=branch_data.get('upi', False),
                    is_active=True,
                    last_verified=timezone.now().date()
                )
                
                batch.append(branch)
                count += 1
                
                # Bulk create in batches
                if len(batch) >= batch_size:
                    BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
                    self.stdout.write(f'Imported {count} records...')
                    batch = []
                    
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.WARNING(f'Error importing {ifsc_code}: {e}'))
        
        # Import remaining records
        if batch:
            BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'\nImport completed successfully!'))
        self.stdout.write(f'Total imported: {count}')
        self.stdout.write(f'Errors: {errors}')
        self.stdout.write(f'Total in database: {BankBranch.objects.count()}')
        self.stdout.write(f'Unique banks: {BankBranch.objects.values("bank_name").distinct().count()}')
