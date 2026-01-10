"""
Django management command to import IFSC data from Razorpay
Downloads branch details ONCE and stores locally - no repeated API calls

Approach:
1. Load IFSC list from local IFSC.json (from git clone)
2. Fetch branch details from Razorpay API (one-time import)
3. Store in database for fast, offline lookups

Data Source: https://github.com/razorpay/ifsc + https://ifsc.razorpay.com API
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch
import json
import os
import requests
import time
import concurrent.futures


class Command(BaseCommand):
    help = 'Import IFSC data from Razorpay - downloads branch details once'

    # Razorpay IFSC API (used ONLY during import, not runtime)
    API_URL = 'https://ifsc.razorpay.com/'
    
    # Priority banks for quick import (can import all later)
    PRIORITY_BANKS = [
        'SBIN', 'HDFC', 'ICIC', 'UTIB', 'PUNB', 'BARB', 'CNRB', 
        'UBIN', 'BKID', 'KKBK', 'IDFB', 'YESB', 'INDB', 'FDRL',
        'CBIN', 'IDIB', 'IOBA', 'UCBA', 'PSIB', 'MAHB', 'KARB',
    ]

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
        parser.add_argument(
            '--banks',
            type=str,
            default='',
            help='Comma-separated bank codes (default: priority banks)'
        )
        parser.add_argument(
            '--limit-per-bank',
            type=int,
            default=100,
            help='Max branches per bank (0 = all, default: 100 for quick import)'
        )
        parser.add_argument(
            '--threads',
            type=int,
            default=10,
            help='Parallel API requests (default: 10)'
        )

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        
        # Make data_dir relative to backend directory
        if not os.path.isabs(data_dir):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_dir = os.path.join(backend_dir, data_dir)
        
        # Load IFSC list
        ifsc_list_path = os.path.join(data_dir, 'IFSC.json')
        banknames_path = os.path.join(data_dir, 'banknames.json')
        
        if not os.path.exists(ifsc_list_path):
            self.stdout.write(self.style.ERROR(f'IFSC.json not found at {ifsc_list_path}'))
            self.stdout.write('Run: git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc')
            return

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            deleted = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {deleted} existing records')

        # Load data
        self.stdout.write(f'Loading IFSC list from {ifsc_list_path}...')
        with open(ifsc_list_path, 'r', encoding='utf-8') as f:
            ifsc_data = json.load(f)
        
        bank_names = {}
        if os.path.exists(banknames_path):
            with open(banknames_path, 'r', encoding='utf-8') as f:
                bank_names = json.load(f)
        
        self.stdout.write(f'Found {len(ifsc_data)} banks, {len(bank_names)} bank names')

        # Determine which banks to import
        if options['banks']:
            bank_codes = [b.strip().upper() for b in options['banks'].split(',')]
        else:
            bank_codes = [b for b in self.PRIORITY_BANKS if b in ifsc_data]

        # Build IFSC codes list
        limit = options['limit_per_bank']
        ifsc_codes = []
        
        for bank_code in bank_codes:
            if bank_code not in ifsc_data:
                self.stdout.write(self.style.WARNING(f'Bank {bank_code} not found'))
                continue
            
            suffixes = ifsc_data[bank_code]
            bank_name = bank_names.get(bank_code, f'{bank_code} Bank')
            
            for i, suffix in enumerate(suffixes):
                if limit and i >= limit:
                    break
                # IFSC format: 4-letter code + '0' + 6-digit suffix
                ifsc_code = f'{bank_code}0{str(suffix).zfill(6)}'
                ifsc_codes.append((ifsc_code, bank_name))

        self.stdout.write(f'Will fetch {len(ifsc_codes)} IFSC codes from {len(bank_codes)} banks...')
        self.stdout.write('Downloading branch details from Razorpay API (one-time import)...')

        # Fetch in parallel
        total_imported = 0
        total_errors = 0
        batch = []
        batch_size = 100

        with concurrent.futures.ThreadPoolExecutor(max_workers=options['threads']) as executor:
            futures = {
                executor.submit(self._fetch_branch, ifsc, bank_name): ifsc 
                for ifsc, bank_name in ifsc_codes
            }
            
            for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
                try:
                    branch = future.result()
                    if branch:
                        batch.append(branch)
                        total_imported += 1
                except Exception:
                    total_errors += 1

                if i % 200 == 0:
                    self.stdout.write(f'Progress: {i}/{len(ifsc_codes)} ({total_imported} imported)')
                
                if len(batch) >= batch_size:
                    BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
                    batch = []

        # Save remaining
        if batch:
            BankBranch.objects.bulk_create(batch, ignore_conflicts=True)

        # Cleanup temp directory reminder
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('IFSC Import Completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Total imported: {total_imported}')
        self.stdout.write(f'Errors: {total_errors}')
        self.stdout.write(f'Total in database: {BankBranch.objects.count()}')
        self.stdout.write(f'Unique banks: {BankBranch.objects.values("bank_name").distinct().count()}')
        
        # Sample
        sample = BankBranch.objects.filter(ifsc_code__startswith='SBIN')[:3]
        if sample:
            self.stdout.write('')
            self.stdout.write('Sample SBI branches:')
            for b in sample:
                self.stdout.write(f'  {b.ifsc_code} - {b.branch_name}, {b.city}, {b.state}')
        
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Cleanup: rm -rf temp_razorpay_ifsc'))

    def _fetch_branch(self, ifsc_code, fallback_bank_name):
        """Fetch branch details from Razorpay API"""
        try:
            response = requests.get(f'{self.API_URL}{ifsc_code}', timeout=15)
            if response.status_code == 200:
                data = response.json()
                return BankBranch(
                    ifsc_code=ifsc_code.upper(),
                    bank_name=data.get('BANK', fallback_bank_name),
                    branch_name=data.get('BRANCH', ''),
                    address=data.get('ADDRESS', ''),
                    city=data.get('CITY', ''),
                    district=data.get('DISTRICT', ''),
                    state=data.get('STATE', ''),
                    contact=str(data.get('CONTACT', ''))[:50],
                    rtgs=data.get('RTGS', True),
                    neft=data.get('NEFT', True),
                    imps=data.get('IMPS', True),
                    upi=data.get('UPI', False),
                    is_active=True,
                    data_source='Razorpay/RBI',
                    last_verified=timezone.now().date()
                )
            return None
        except Exception:
            return None
