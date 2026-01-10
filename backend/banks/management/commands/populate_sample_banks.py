"""
Django management command to populate sample bank data for testing
This creates a minimal set of major Indian banks for development/testing
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from banks.models import BankBranch


class Command(BaseCommand):
    help = 'Populate sample bank branches for testing (major Indian banks)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            count = BankBranch.objects.count()
            BankBranch.objects.all().delete()
            self.stdout.write(f'Deleted {count} existing records')
        
        self.stdout.write('Creating sample bank branches...')
        
        # Sample data for major banks (for testing)
        sample_branches = [
            # State Bank of India
            {'ifsc': 'SBIN0000001', 'bank': 'State Bank of India', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'SBIN0000002', 'bank': 'State Bank of India', 'branch': 'Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            {'ifsc': 'SBIN0000003', 'bank': 'State Bank of India', 'branch': 'Bangalore Main', 'city': 'Bangalore', 'state': 'Karnataka'},
            {'ifsc': 'SBIN0000004', 'bank': 'State Bank of India', 'branch': 'Hyderabad Main', 'city': 'Hyderabad', 'state': 'Telangana'},
            
            # HDFC Bank
            {'ifsc': 'HDFC0000001', 'bank': 'HDFC Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'HDFC0000002', 'bank': 'HDFC Bank', 'branch': 'Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            {'ifsc': 'HDFC0000003', 'bank': 'HDFC Bank', 'branch': 'Pune Main', 'city': 'Pune', 'state': 'Maharashtra'},
            
            # ICICI Bank
            {'ifsc': 'ICIC0000001', 'bank': 'ICICI Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'ICIC0000002', 'bank': 'ICICI Bank', 'branch': 'Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            {'ifsc': 'ICIC0000003', 'bank': 'ICICI Bank', 'branch': 'Chennai Main', 'city': 'Chennai', 'state': 'Tamil Nadu'},
            
            # Axis Bank
            {'ifsc': 'UTIB0000001', 'bank': 'Axis Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'UTIB0000002', 'bank': 'Axis Bank', 'branch': 'Bangalore Main', 'city': 'Bangalore', 'state': 'Karnataka'},
            
            # Punjab National Bank
            {'ifsc': 'PUNB0000001', 'bank': 'Punjab National Bank', 'branch': 'New Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            {'ifsc': 'PUNB0000002', 'bank': 'Punjab National Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            
            # Bank of Baroda
            {'ifsc': 'BARB0000001', 'bank': 'Bank of Baroda', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'BARB0000002', 'bank': 'Bank of Baroda', 'branch': 'Vadodara Main', 'city': 'Vadodara', 'state': 'Gujarat'},
            
            # Canara Bank
            {'ifsc': 'CNRB0000001', 'bank': 'Canara Bank', 'branch': 'Bangalore Main', 'city': 'Bangalore', 'state': 'Karnataka'},
            {'ifsc': 'CNRB0000002', 'bank': 'Canara Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            
            # Union Bank of India
            {'ifsc': 'UBIN0000001', 'bank': 'Union Bank of India', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'UBIN0000002', 'bank': 'Union Bank of India', 'branch': 'Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            
            # Bank of India
            {'ifsc': 'BKID0000001', 'bank': 'Bank of India', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'BKID0000002', 'bank': 'Bank of India', 'branch': 'Kolkata Main', 'city': 'Kolkata', 'state': 'West Bengal'},
            
            # Indian Bank
            {'ifsc': 'IDIB0000001', 'bank': 'Indian Bank', 'branch': 'Chennai Main', 'city': 'Chennai', 'state': 'Tamil Nadu'},
            {'ifsc': 'IDIB0000002', 'bank': 'Indian Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            
            # Kotak Mahindra Bank
            {'ifsc': 'KKBK0000001', 'bank': 'Kotak Mahindra Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'KKBK0000002', 'bank': 'Kotak Mahindra Bank', 'branch': 'Delhi Main', 'city': 'New Delhi', 'state': 'Delhi'},
            
            # IndusInd Bank
            {'ifsc': 'INDB0000001', 'bank': 'IndusInd Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'INDB0000002', 'bank': 'IndusInd Bank', 'branch': 'Pune Main', 'city': 'Pune', 'state': 'Maharashtra'},
            
            # Yes Bank
            {'ifsc': 'YESB0000001', 'bank': 'Yes Bank', 'branch': 'Mumbai Main', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'ifsc': 'YESB0000002', 'bank': 'Yes Bank', 'branch': 'Bangalore Main', 'city': 'Bangalore', 'state': 'Karnataka'},
        ]
        
        created = 0
        for data in sample_branches:
            BankBranch.objects.get_or_create(
                ifsc_code=data['ifsc'],
                defaults={
                    'bank_name': data['bank'],
                    'branch_name': data['branch'],
                    'address': f"{data['branch']}, {data['city']}",
                    'city': data['city'],
                    'district': data['city'],
                    'state': data['state'],
                    'rtgs': True,
                    'neft': True,
                    'imps': True,
                    'upi': True,
                    'is_active': True,
                    'data_source': 'Sample Data (populate_sample_banks)',
                    'last_verified': timezone.now().date()
                }
            )
            created += 1
        
        self.stdout.write(self.style.SUCCESS(f'\nSample data creation completed!'))
        self.stdout.write(f'Created/verified: {created} branches')
        self.stdout.write(f'Total in database: {BankBranch.objects.count()}')
        self.stdout.write(f'Unique banks: {BankBranch.objects.values("bank_name").distinct().count()}')
        self.stdout.write('\n' + self.style.WARNING('NOTE: This is minimal sample data for testing.'))
        self.stdout.write(self.style.WARNING('For production, use: python manage.py import_ifsc_data'))
