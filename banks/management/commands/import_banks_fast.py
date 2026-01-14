"""
Fast import of IFSC data using static JSON + Razorpay API enrichment.
Combines speed of bulk import with accuracy of API branch details.

Process:
1. Load IFSC codes from static JSON files (fast)
2. Fetch detailed branch info from Razorpay API in parallel batches
3. Bulk create records with complete data

Usage:
    git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc
    python manage.py import_banks_fast --data-dir temp_razorpay_ifsc/src
    rm -rf temp_razorpay_ifsc

Data Source: https://github.com/razorpay/ifsc + https://ifsc.razorpay.com API
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch
import json
import os
import requests
import concurrent.futures
import time


class Command(BaseCommand):
    help = 'Import bank data from static JSON files + Razorpay API for branch details'
    
    # Razorpay IFSC API endpoint (used during import only)
    API_URL = 'https://ifsc.razorpay.com/'

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
            '--threads',
            type=int,
            default=20,
            help='Number of parallel API requests (default: 20)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for database inserts (default: 1000)'
        )
        parser.add_argument(
            '--skip-api',
            action='store_true',
            help='Skip API calls, use placeholder branch names (faster but incomplete)'
        )

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        use_api = not options['skip_api']
        
        # Make data_dir relative to backend directory
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
        
        # Load bank names mapping
        bank_names = {}
        if os.path.exists(banknames_path):
            with open(banknames_path, 'r', encoding='utf-8') as f:
                bank_names = json.load(f)
            self.stdout.write(f'Loaded {len(bank_names)} bank name mappings')
        
        # Load IFSC data (list of suffixes per bank)
        self.stdout.write(f'Loading IFSC data from {ifsc_path}...')
        with open(ifsc_path, 'r', encoding='utf-8') as f:
            ifsc_data = json.load(f)
        
        # Build complete list of IFSC codes with bank info
        ifsc_codes = []
        for bank_code, suffixes in ifsc_data.items():
            bank_name = bank_names.get(bank_code, f'{bank_code} Bank')
            for suffix in suffixes:
                # IFSC format: 4-letter code + '0' + 6-digit suffix
                ifsc_code = f'{bank_code}0{str(suffix).zfill(6)}'.upper()
                ifsc_codes.append((ifsc_code, bank_name))
        
        total_codes = len(ifsc_codes)
        self.stdout.write(f'Found {total_codes} IFSC codes from {len(ifsc_data)} banks')
        
        if use_api:
            self._import_with_api(ifsc_codes, options)
        else:
            self._import_without_api(ifsc_codes, options)
        
        # Final summary
        final_count = BankBranch.objects.count()
        unique_banks = BankBranch.objects.values('bank_name').distinct().count()
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('IFSC Import Completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Total branches in database: {final_count}')
        self.stdout.write(f'Unique banks: {unique_banks}')
        
        # Sample output
        sample = BankBranch.objects.filter(ifsc_code__startswith='SBIN')[:3]
        if sample:
            self.stdout.write('')
            self.stdout.write('Sample SBI branches:')
            for b in sample:
                self.stdout.write(f'  {b.ifsc_code} - {b.branch_name}, {b.city or "N/A"}, {b.state or "N/A"}')

    def _import_with_api(self, ifsc_codes, options):
        """Import with API calls to fetch complete branch details."""
        self.stdout.write(self.style.WARNING(
            f'Fetching branch details from Razorpay API ({options["threads"]} parallel threads)...'
        ))
        self.stdout.write('This may take several minutes for large datasets.')
        
        batch_size = options['batch_size']
        max_workers = options['threads']
        
        total_imported = 0
        total_errors = 0
        batch = []
        start_time = time.time()
        
        # Process in parallel batches
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._fetch_branch_from_api, ifsc, bank_name): ifsc
                for ifsc, bank_name in ifsc_codes
            }
            
            for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
                try:
                    branch = future.result()
                    if branch:
                        batch.append(branch)
                        total_imported += 1
                    else:
                        total_errors += 1
                except Exception as e:
                    total_errors += 1
                
                # Progress update every 2000 records
                if i % 2000 == 0:
                    elapsed = time.time() - start_time
                    rate = i / elapsed if elapsed > 0 else 0
                    remaining = (len(ifsc_codes) - i) / rate if rate > 0 else 0
                    self.stdout.write(
                        f'Progress: {i}/{len(ifsc_codes)} ({total_imported} OK, {total_errors} errors) '
                        f'- {rate:.0f}/sec, ~{remaining/60:.1f}min remaining'
                    )
                
                # Bulk insert when batch is full
                if len(batch) >= batch_size:
                    BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
                    batch = []
        
        # Insert remaining
        if batch:
            BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
        
        elapsed = time.time() - start_time
        self.stdout.write(f'API import completed in {elapsed/60:.1f} minutes')
        self.stdout.write(f'Successfully imported: {total_imported}, Errors: {total_errors}')

    def _fetch_branch_from_api(self, ifsc_code, fallback_bank_name):
        """Fetch branch details from Razorpay API with retry logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    f'{self.API_URL}{ifsc_code}',
                    timeout=10,
                    headers={'User-Agent': 'PMIS-BankImport/1.0'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return BankBranch(
                        ifsc_code=ifsc_code,
                        bank_name=data.get('BANK') or fallback_bank_name,
                        branch_name=data.get('BRANCH') or data.get('CENTRE') or 'Unknown Branch',
                        address=data.get('ADDRESS') or '',
                        city=data.get('CITY') or '',
                        district=data.get('DISTRICT') or '',
                        state=data.get('STATE') or '',
                        contact=str(data.get('CONTACT') or '')[:50],
                        rtgs=data.get('RTGS', True),
                        neft=data.get('NEFT', True),
                        imps=data.get('IMPS', True),
                        upi=data.get('UPI', False),
                        is_active=True,
                        data_source='Razorpay/RBI',
                        last_verified=timezone.now().date()
                    )
                elif response.status_code == 404:
                    # IFSC not found - skip silently
                    return None
                else:
                    # Other error - retry
                    time.sleep(0.1 * (attempt + 1))
                    
            except requests.exceptions.Timeout:
                time.sleep(0.2 * (attempt + 1))
            except Exception:
                time.sleep(0.1 * (attempt + 1))
        
        return None

    def _import_without_api(self, ifsc_codes, options):
        """Fast import without API - uses placeholder branch names."""
        self.stdout.write(self.style.WARNING(
            'Importing without API (--skip-api flag). Branch names will be placeholders.'
        ))
        
        batch_size = options['batch_size']
        branches = []
        total_codes = len(ifsc_codes)
        
        for i, (ifsc_code, bank_name) in enumerate(ifsc_codes, 1):
            # Extract suffix from IFSC (last 6 characters) for placeholder name
            suffix = ifsc_code[-6:].lstrip('0') or '0'
            
            branches.append(BankBranch(
                ifsc_code=ifsc_code,
                bank_name=bank_name,
                branch_name=f'Branch {suffix}',
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
            
            # Bulk insert every batch_size records
            if len(branches) >= batch_size:
                BankBranch.objects.bulk_create(branches, ignore_conflicts=True)
                self.stdout.write(f'Progress: {i}/{total_codes} IFSC codes processed...')
                branches = []
        
        # Insert remaining
        if branches:
            BankBranch.objects.bulk_create(branches, ignore_conflicts=True)
        
        self.stdout.write(f'Fast import completed: {total_codes} IFSC codes')
