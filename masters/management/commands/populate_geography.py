from django.core.management.base import BaseCommand
from masters.models.locations import Country, State


class Command(BaseCommand):
    help = 'Populate Indian geography - Country and States only'

    def handle(self, *args, **options):
        # Create India
        india, created = Country.objects.get_or_create(
            code='IN',
            defaults={'name': 'India', 'dial_code': '+91'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created country: India'))
        else:
            self.stdout.write(f'✓ Country already exists: India')

        # Indian States and Union Territories
        indian_states = [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
            'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
            'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
            'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
            'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            # Union Territories
            'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
            'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
        ]

        states_created = 0
        states_existing = 0

        for state_name in indian_states:
            state, created = State.objects.get_or_create(
                country=india,
                name=state_name,
                defaults={'code': state_name[:3].upper()}
            )
            if created:
                states_created += 1
            else:
                states_existing += 1

        self.stdout.write(self.style.SUCCESS(
            f'✓ States: {states_created} created, {states_existing} already existed'
        ))
        
        self.stdout.write(self.style.SUCCESS('\\n✅ Geography data loaded!'))
        self.stdout.write(f'📊 Total: {Country.objects.count()} countries, {State.objects.count()} states')
