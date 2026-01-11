"""
Fast import of IFSC data using static JSON files from Razorpay repo.
NO API calls - uses local JSON data directly for fast bulk import.

Usage:
    git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc
    python manage.py import_banks_fast --data-dir temp_razorpay_ifsc/src
    rm -rf temp_razorpay_ifsc
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch
import json
import os


class Command(BaseCommand):
    help = 'Fast import of bank data from static JSON files (no API calls)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir',
            type=str,
            default='temp_razorpay_ifsc/src',
            help='Path to Razorpay IFSC cloned repo src directory'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
        )

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        
        # Make data_dir relative to backend directory
        # Command is at banks/management/commands/
        if not os.path.isabs(data_dir):
            cmd_dir = os.path.dirname(os.path.abspath(__file__))
            management_dir = os.path.dirname(cmd_dir)
            banks_dir = os.path.dirname(management_dir)
            backend_dir = os.path.dirname(banks_dir)
            data_dir = os.path.join(backend_dir, data_dir)
        
        # Check for required files
        ifsc_path = os.path.join(data_dir, 'IFSC.json')
        banknames_path = os.path.join(data_dir, 'banknames.json')
        
        if not os.path.exists(ifsc_path):
            self.stdout.write(self.style.ERROR(f'IFSC.json not found at {ifsc_path}'))
            self.stdout.write('Run: git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc')
            return
        
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing bank data...'))
            deleted = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {deleted} existing records')
        
        # Load bank names
        bank_names = {}
        if os.path.exists(banknames_path):
            with open(banknames_path, 'r', encoding='utf-8') as f:
                bank_names = json.load(f)
            self.stdout.write(f'Loaded {len(bank_names)} bank names')
        
        # Load IFSC data
        self.stdout.write(f'Loading IFSC data from {ifsc_path}...')
        with open(ifsc_path, 'r', encoding='utf-8') as f:
            ifsc_data = json.load(f)
        
        self.stdout.write(f'Found {len(ifsc_data)} banks in IFSC.json')
        
        # Build all IFSC codes with bank info
        branches = []
        total_codes = 0
        
        for bank_code, suffixes in ifsc_data.items():
            bank_name = bank_names.get(bank_code, f'{bank_code} Bank')
            
            for suffix in suffixes:
                # IFSC format: 4-letter code + '0' + 6-digit suffix
                ifsc_code = f'{bank_code}0{str(suffix).zfill(6)}'
                
                branches.append(BankBranch(
                    ifsc_code=ifsc_code.upper(),
                    bank_name=bank_name,
                    branch_name=f'Branch {suffix}',  # Default branch name
                    address='',
                    city='',
                    district='',
                    state='',
                    contact='',
                    rtgs=True,
                    neft=True,
                    imps=True,
                    upi=False,
                    is_active=True,
                    data_source='Razorpay/RBI (static)',
                    last_verified=timezone.now().date()
                ))
                
                total_codes += 1
                
                # Bulk insert every 5000 records
                if len(branches) >= 5000:
                    BankBranch.objects.bulk_create(branches, ignore_conflicts=True)
                    self.stdout.write(f'Progress: {total_codes} IFSC codes processed...')
                    branches = []
        
        # Insert remaining
        if branches:
            BankBranch.objects.bulk_create(branches, ignore_conflicts=True)
        
        # Summary
        final_count = BankBranch.objects.count()
        unique_banks = BankBranch.objects.values('bank_name').distinct().count()
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('IFSC Import Completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Total IFSC codes processed: {total_codes}')
        self.stdout.write(f'Total branches in database: {final_count}')
        self.stdout.write(f'Unique banks: {unique_banks}')
        
        # Sample
        sample = BankBranch.objects.filter(ifsc_code__startswith='SBIN')[:3]
        if sample:
            self.stdout.write('')
            self.stdout.write('Sample SBI branches:')
            for b in sample:
                self.stdout.write(f'  {b.ifsc_code} - {b.bank_name}')
