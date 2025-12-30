"""
Django management command to import IFSC data from CSV file
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch
import csv


class Command(BaseCommand):
    help = 'Import IFSC data from CSV file (snarayanank2/indian_banks format)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='temp_indian_banks/bank_branches.csv',
            help='Path to CSV file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            count = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {count} existing records')
        
        self.stdout.write(f'Importing IFSC data from {file_path}...')
        
        # Open CSV file
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            batch = []
            count = 0
            errors = 0
            batch_size = 1000
            
            for row in reader:
                try:
                    branch = BankBranch(
                        ifsc_code=row['ifsc'].upper(),
                        bank_name=row['bank_name'],
                        branch_name=row['branch'] or '',
                        address=row['address'] or '',
                        city=row['city'] or '',
                        district=row['district'] or '',
                        state=row['state'] or '',
                        # Set payment systems based on data (most branches support these)
                        rtgs=True,
                        neft=True,
                        imps=True,
                        upi=True,  # Assuming UPI support for modern banks
                        is_active=True,
                        data_source='snarayanank2/indian_banks',
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
                    if errors <= 10:  # Only show first 10 errors
                        self.stdout.write(self.style.WARNING(f'Error importing {row.get("ifsc", "UNKNOWN")}: {e}'))
            
            # Import remaining records
            if batch:
                BankBranch.objects.bulk_create(batch, ignore_conflicts=True)
            
            # Summary
            self.stdout.write(self.style.SUCCESS(f'\nImport completed successfully!'))
            self.stdout.write(f'Total imported: {count}')
            self.stdout.write(f'Errors: {errors}')
            self.stdout.write(f'Total in database: {BankBranch.objects.count()}')
            self.stdout.write(f'Unique banks: {BankBranch.objects.values("bank_name").distinct().count()}')
