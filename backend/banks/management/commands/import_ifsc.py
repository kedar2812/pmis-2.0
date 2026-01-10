"""
Django management command to import IFSC data from Razorpay API
Uses the public IFSC lookup API with the IFSC list from releases

Data Source: 
- IFSC list: https://github.com/razorpay/ifsc/releases/latest/download/IFSC.json
- Branch details: https://ifsc.razorpay.com/{IFSC_CODE}
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch
import requests
import time
import concurrent.futures


class Command(BaseCommand):
    help = 'Import IFSC data from Razorpay API'

    # Razorpay IFSC API
    API_URL = 'https://ifsc.razorpay.com/'
    IFSC_LIST_URL = 'https://github.com/razorpay/ifsc/releases/latest/download/IFSC.json'
    
    # Major banks to import (prioritized)
    PRIORITY_BANKS = [
        'SBIN',  # State Bank of India (~24k branches)
        'PUNB',  # Punjab National Bank
        'CNRB',  # Canara Bank
        'BARB',  # Bank of Baroda
        'UBIN',  # Union Bank of India
        'BKID',  # Bank of India
        'CBIN',  # Central Bank of India
        'IOBA',  # Indian Overseas Bank
        'UCBA',  # UCO Bank
        'MAHB',  # Bank of Maharashtra
        'IDIB',  # Indian Bank
        'PSIB',  # Punjab & Sind Bank
        'HDFC',  # HDFC Bank
        'ICIC',  # ICICI Bank
        'UTIB',  # Axis Bank
        'KKBK',  # Kotak Mahindra Bank
        'YESB',  # Yes Bank
        'INDB',  # IndusInd Bank
        'IDFB',  # IDFC First Bank
        'FDRL',  # Federal Bank
        'KARB',  # Karnataka Bank
        'SVCB',  # SVC Bank
        'KVBL',  # Karur Vysya Bank
        'TMBL',  # Tamilnad Mercantile Bank
        'CSBK',  # CSB Bank
        'DBSS',  # DBS Bank India
        'CITI',  # Citibank
        'HSBC',  # HSBC
        'SCBL',  # Standard Chartered
    ]

    def add_arguments(self, parser):
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
            help='Max branches per bank (default: 100, 0 = all)'
        )
        parser.add_argument(
            '--threads',
            type=int,
            default=5,
            help='Number of parallel requests (default: 5)'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            deleted_count = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {deleted_count} existing records')

        # Get bank filter
        if options['banks']:
            bank_filter = [b.strip().upper() for b in options['banks'].split(',')]
        else:
            bank_filter = self.PRIORITY_BANKS

        # Download IFSC list
        self.stdout.write('Downloading IFSC code list...')
        try:
            response = requests.get(self.IFSC_LIST_URL, timeout=60)
            response.raise_for_status()
            ifsc_list_data = response.json()
            self.stdout.write(f'Found {len(ifsc_list_data)} banks in IFSC list')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to download IFSC list: {e}'))
            return

        # Build list of IFSC codes to fetch
        ifsc_codes_to_fetch = []
        limit_per_bank = options['limit_per_bank']

        for bank_code in bank_filter:
            if bank_code not in ifsc_list_data:
                self.stdout.write(self.style.WARNING(f'Bank {bank_code} not in IFSC list'))
                continue
            
            # The IFSC list format: bank_code -> list of branch suffixes (as numbers)
            suffixes = ifsc_list_data[bank_code]
            
            # Generate full IFSC codes: BANK + 0 + suffix (6 digits padded)
            for i, suffix in enumerate(suffixes):
                if limit_per_bank and i >= limit_per_bank:
                    break
                # IFSC format: 4 letter bank code + 0 + 6 char suffix
                ifsc_code = f'{bank_code}0{str(suffix).zfill(6)}'
                ifsc_codes_to_fetch.append(ifsc_code)

        self.stdout.write(f'Will fetch {len(ifsc_codes_to_fetch)} IFSC codes...')

        # Fetch branch details in parallel
        total_imported = 0
        total_errors = 0
        batch = []
        batch_size = 100

        with concurrent.futures.ThreadPoolExecutor(max_workers=options['threads']) as executor:
            future_to_ifsc = {
                executor.submit(self._fetch_branch, ifsc): ifsc 
                for ifsc in ifsc_codes_to_fetch
            }
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_ifsc), 1):
                ifsc = future_to_ifsc[future]
                try:
                    branch_data = future.result()
                    if branch_data:
                        batch.append(branch_data)
                        total_imported += 1
                    else:
                        total_errors += 1
                except Exception:
                    total_errors += 1

                # Progress and batch save
                if i % 100 == 0:
                    self.stdout.write(f'Progress: {i}/{len(ifsc_codes_to_fetch)} ({total_imported} imported)')
                
                if len(batch) >= batch_size:
                    self._save_batch(batch)
                    batch = []

        # Save remaining
        if batch:
            self._save_batch(batch)

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Import completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
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
                self.stdout.write(f'  {b.ifsc_code} - {b.branch_name}, {b.city}')

    def _fetch_branch(self, ifsc_code):
        """Fetch branch details from Razorpay API"""
        try:
            response = requests.get(f'{self.API_URL}{ifsc_code}', timeout=10)
            if response.status_code == 200:
                data = response.json()
                return BankBranch(
                    ifsc_code=ifsc_code.upper(),
                    bank_name=data.get('BANK', ''),
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

    def _save_batch(self, batch):
        """Bulk save branch records"""
        BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
