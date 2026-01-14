"""
Management command to check contractor validity and mark expired ones as inactive.

This command should be run daily via cron or Celery beat to:
1. Check all contractors with validity_date < today
2. Mark them as expired (optional: set a status field or send notifications)
3. Log the results

Usage:
    python manage.py check_contractor_validity
    python manage.py check_contractor_validity --dry-run  # Preview without changes
    python manage.py check_contractor_validity --notify   # Send email notifications
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from masters.models import Contractor


class Command(BaseCommand):
    help = 'Check contractor registration validity and mark expired contractors'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would happen without making changes',
        )
        parser.add_argument(
            '--notify',
            action='store_true',
            help='Send notification emails for expiring contractors',
        )
        parser.add_argument(
            '--days-warning',
            type=int,
            default=30,
            help='Days before expiry to send warning (default: 30)',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        dry_run = options['dry_run']
        notify = options['notify']
        warning_days = options['days_warning']
        
        self.stdout.write(self.style.NOTICE(f'\n📋 Contractor Validity Check - {today}'))
        self.stdout.write('=' * 50)
        
        # 1. Find already expired contractors (not blacklisted)
        expired_contractors = Contractor.objects.filter(
            validity_date__lt=today,
            blacklisted=False
        )
        
        expired_count = expired_contractors.count()
        self.stdout.write(f'\n🔴 Expired contractors: {expired_count}')
        
        if expired_count > 0:
            for contractor in expired_contractors:
                days_expired = (today - contractor.validity_date).days
                self.stdout.write(
                    f'   - {contractor.code}: {contractor.name} '
                    f'(expired {days_expired} days ago on {contractor.validity_date})'
                )
        
        # 2. Find contractors expiring soon (warning)
        from datetime import timedelta
        warning_date = today + timedelta(days=warning_days)
        
        expiring_soon = Contractor.objects.filter(
            validity_date__gte=today,
            validity_date__lte=warning_date,
            blacklisted=False
        )
        
        expiring_count = expiring_soon.count()
        self.stdout.write(f'\n🟡 Expiring within {warning_days} days: {expiring_count}')
        
        if expiring_count > 0:
            for contractor in expiring_soon:
                days_left = (contractor.validity_date - today).days
                self.stdout.write(
                    f'   - {contractor.code}: {contractor.name} '
                    f'(expires in {days_left} days on {contractor.validity_date})'
                )
        
        # 3. Count active (valid) contractors
        active = Contractor.objects.filter(
            blacklisted=False
        ).filter(
            models.Q(validity_date__isnull=True) | models.Q(validity_date__gte=today)
        )
        
        # Import models for Q
        from django.db import models as db_models
        active = Contractor.objects.filter(
            blacklisted=False
        ).filter(
            db_models.Q(validity_date__isnull=True) | db_models.Q(validity_date__gt=warning_date)
        )
        
        active_count = active.count()
        self.stdout.write(f'\n🟢 Active contractors: {active_count}')
        
        # 4. Summary
        total = Contractor.objects.count()
        blacklisted = Contractor.objects.filter(blacklisted=True).count()
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'📊 Summary:'))
        self.stdout.write(f'   Total contractors: {total}')
        self.stdout.write(f'   Active: {active_count}')
        self.stdout.write(f'   Expiring soon: {expiring_count}')
        self.stdout.write(f'   Expired: {expired_count}')
        self.stdout.write(f'   Blacklisted: {blacklisted}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN - No changes made'))
        
        if notify and not dry_run:
            self.stdout.write(self.style.NOTICE('\n📧 Sending notifications...'))
            self._send_notifications(expiring_soon, expired_contractors)
        
        return
    
    def _send_notifications(self, expiring_soon, expired):
        """
        Send email notifications for expiring/expired contractors.
        This is a placeholder - implement actual email logic here.
        """
        # TODO: Implement email notifications
        # from django.core.mail import send_mail
        # 
        # For now, just log what would be sent
        for contractor in expiring_soon:
            self.stdout.write(f'   Would notify: {contractor.email or "no email"} about upcoming expiry')
        
        for contractor in expired:
            self.stdout.write(f'   Would notify admins about expired: {contractor.name}')
        
        self.stdout.write(self.style.SUCCESS('   ✅ Notifications would be sent (not implemented yet)'))
