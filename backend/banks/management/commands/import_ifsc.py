"""
Django management command to import IFSC data from Razorpay GitHub releases.

Downloads the latest IFSC.csv from:
https://github.com/razorpay/ifsc/releases/latest/download/IFSC.csv

This file contains ~177K bank branches with complete details including:
- IFSC code, Bank name, Branch name
- Address, City, District, State
- RTGS, NEFT, IMPS, UPI support flags

Usage:
    python manage.py import_ifsc          # Download and import latest data
    python manage.py import_ifsc --clear  # Clear existing data first
    python manage.py import_ifsc --file ~/IFSC.csv  # Import from local file

Data Source: https://github.com/razorpay/ifsc (Updated by RBI regularly)
"""
import csv
import os
import tempfile
import urllib.request
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch


class Command(BaseCommand):
    help = 'Import IFSC data from Razorpay GitHub releases (CSV format)'

    # Direct download URL for latest IFSC.csv
    DOWNLOAD_URL = 'https://github.com/razorpay/ifsc/releases/latest/download/IFSC.csv'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Path to local IFSC.csv file (skips download)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5000,
            help='Batch size for database inserts (default: 5000)'
        )

    def handle(self, *args, **options):
        csv_file = options['file']
        temp_file = None

        # Download if no local file specified
        if not csv_file:
            self.stdout.write('Downloading IFSC.csv from Razorpay GitHub releases...')
            self.stdout.write(f'URL: {self.DOWNLOAD_URL}')
            
            try:
                # Create temp file
                temp_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False)
                
                # Download with progress
                def show_progress(block_num, block_size, total_size):
                    if total_size > 0:
                        percent = min(100, block_num * block_size * 100 / total_size)
                        mb_downloaded = (block_num * block_size) / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        self.stdout.write(
                            f'\rDownloading: {mb_downloaded:.1f}/{mb_total:.1f} MB ({percent:.0f}%)',
                            ending=''
                        )
                
                urllib.request.urlretrieve(self.DOWNLOAD_URL, temp_file.name, show_progress)
                self.stdout.write('')  # New line after progress
                
                csv_file = temp_file.name
                file_size = os.path.getsize(csv_file) / (1024 * 1024)
                self.stdout.write(self.style.SUCCESS(f'Downloaded: {file_size:.1f} MB'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Download failed: {e}'))
                self.stdout.write('You can manually download from:')
                self.stdout.write('  https://github.com/razorpay/ifsc/releases/latest')
                self.stdout.write('Then run: python manage.py import_ifsc --file /path/to/IFSC.csv')
                return

        # Verify file exists
        if not os.path.exists(csv_file):
            self.stdout.write(self.style.ERROR(f'File not found: {csv_file}'))
            return

        # Clear existing data if requested
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing bank data...'))
            deleted_count = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {deleted_count} existing records')

        # Import from CSV
        self.stdout.write(f'Importing from {csv_file}...')
        batch_size = options['batch_size']
        
        total_imported = 0
        total_errors = 0
        batch = []

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    try:
                        # Parse boolean fields
                        rtgs = self._parse_bool(row.get('RTGS', 'true'))
                        neft = self._parse_bool(row.get('NEFT', 'true'))
                        imps = self._parse_bool(row.get('IMPS', 'true'))
                        upi = self._parse_bool(row.get('UPI', 'false'))
                        
                        branch = BankBranch(
                            ifsc_code=row['IFSC'].upper().strip(),
                            bank_name=row.get('BANK', '').strip(),
                            branch_name=row.get('BRANCH', '').strip(),
                            address=row.get('ADDRESS', '').strip(),
                            city=row.get('CITY', '').strip(),
                            district=row.get('DISTRICT', '').strip(),
                            state=row.get('STATE', '').strip(),
                            contact=str(row.get('CONTACT', ''))[:50].strip(),
                            rtgs=rtgs,
                            neft=neft,
                            imps=imps,
                            upi=upi,
                            is_active=True,
                            data_source='Razorpay/RBI',
                            last_verified=timezone.now().date()
                        )
                        batch.append(branch)
                        total_imported += 1

                        # Bulk insert when batch is full
                        if len(batch) >= batch_size:
                            BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
                            self.stdout.write(f'Progress: {total_imported:,} records imported...')
                            batch = []

                    except Exception as e:
                        total_errors += 1
                        if total_errors <= 5:
                            self.stdout.write(
                                self.style.WARNING(f'Error on row {total_imported + total_errors}: {e}')
                            )

                # Insert remaining records
                if batch:
                    BankBranch.objects.bulk_create(batch, ignore_conflicts=True)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Import failed: {e}'))
            return

        finally:
            # Cleanup temp file
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)

        # Summary
        db_count = BankBranch.objects.count()
        unique_banks = BankBranch.objects.values('bank_name').distinct().count()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('IFSC Import Completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Records processed: {total_imported:,}')
        self.stdout.write(f'Errors: {total_errors}')
        self.stdout.write(f'Total in database: {db_count:,}')
        self.stdout.write(f'Unique banks: {unique_banks:,}')
        
        # Sample output
        sample = BankBranch.objects.filter(ifsc_code__startswith='SBIN')[:2]
        if sample:
            self.stdout.write('')
            self.stdout.write('Sample SBI branches:')
            for b in sample:
                self.stdout.write(f'  {b.ifsc_code} - {b.branch_name}, {b.city}, {b.state}')

    def _parse_bool(self, value):
        """Parse boolean value from CSV (handles 'true', 'false', 'TRUE', 'FALSE', etc.)"""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower().strip() in ('true', '1', 'yes', 't')
        return bool(value)
