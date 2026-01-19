"""
Management command to fix corrupted/legacy encrypted messages.
Deletes messages that can't be decrypted with current key.
"""
from django.core.management.base import BaseCommand
from communications.models import Message
from communications.encryption import MessageEncryption


class Command(BaseCommand):
    help = 'Fix or delete messages with corrupted/legacy encryption'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete corrupted messages',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete = options['delete']
        
        if not dry_run and not delete:
            self.stdout.write(self.style.WARNING(
                'Use --dry-run to see corrupted messages, or --delete to remove them'
            ))
            return
        
        corrupted_messages = []
        total_checked = 0
        
        self.stdout.write('Checking all encrypted messages...')
        
        for message in Message.objects.filter(is_encrypted=True):
            total_checked += 1
            try:
                content = message.get_decrypted_content()
                if content.startswith('[Message encrypted with different key'):
                    corrupted_messages.append(message)
            except Exception:
                corrupted_messages.append(message)
        
        self.stdout.write(f'Checked {total_checked} encrypted messages')
        self.stdout.write(f'Found {len(corrupted_messages)} corrupted messages')
        
        if not corrupted_messages:
            self.stdout.write(self.style.SUCCESS('No corrupted messages found!'))
            return
        
        # Show details
        for msg in corrupted_messages:
            self.stdout.write(f'  - Message {msg.id} in thread "{msg.thread.subject}"')
        
        if delete:
            # Delete corrupted messages
            for msg in corrupted_messages:
                msg.delete()
            self.stdout.write(self.style.SUCCESS(
                f'Deleted {len(corrupted_messages)} corrupted messages'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f'Would delete {len(corrupted_messages)} messages. Run with --delete to proceed.'
            ))
