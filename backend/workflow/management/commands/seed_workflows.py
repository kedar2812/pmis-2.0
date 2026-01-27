"""
Management command to seed standard Government Approval workflow templates.

Usage:
    python manage.py seed_workflows

This command is idempotent - running it multiple times will not create duplicates.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from workflow.models import (
    WorkflowTemplate, WorkflowStep, WorkflowTriggerRule,
    WorkflowModule, ActionType, ConditionOperator
)


class Command(BaseCommand):
    help = 'Seed standard Government Approval workflow templates'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding workflow templates...'))
        
        # 1. RA Bill Approval Template
        self.create_ra_bill_template()
        
        # 2. Tender Approval Template
        self.create_tender_template()
        
        # 3. Variation Order Template
        self.create_variation_template()
        
        self.stdout.write(self.style.SUCCESS('✅ All workflow templates seeded successfully!'))

    def create_ra_bill_template(self):
        """Create Standard RA Bill Approval workflow."""
        template, created = WorkflowTemplate.objects.get_or_create(
            name='Standard RA Bill Approval',
            module=WorkflowModule.RA_BILL,
            defaults={
                'description': 'Standard Government hierarchy approval flow for Running Account Bills. '
                               'AE verifies → EE recommends → CE sanctions.',
                'is_active': True,
                'is_default': True
            }
        )
        
        if created:
            self.stdout.write(f'  ✓ Created template: {template.name}')
            
            # Create steps
            steps = [
                {
                    'sequence': 1,
                    'role': 'AE',
                    'action_type': ActionType.VERIFY,
                    'action_label': 'Verification',
                    'can_revert': False,
                    'deadline_days': 3,
                    'remarks_required': False
                },
                {
                    'sequence': 2,
                    'role': 'EE',
                    'action_type': ActionType.RECOMMEND,
                    'action_label': 'Technical Review',
                    'can_revert': True,
                    'deadline_days': 5,
                    'remarks_required': False
                },
                {
                    'sequence': 3,
                    'role': 'CE',
                    'action_type': ActionType.APPROVE,
                    'action_label': 'Final Sanction',
                    'can_revert': True,
                    'deadline_days': 7,
                    'remarks_required': False
                }
            ]
            
            for step_data in steps:
                WorkflowStep.objects.create(template=template, **step_data)
                self.stdout.write(f'    → Step {step_data["sequence"]}: {step_data["action_label"]} ({step_data["role"]})')
            
            # Create trigger rule (always active)
            WorkflowTriggerRule.objects.create(
                name='RA Bill Default Trigger',
                module=WorkflowModule.RA_BILL,
                condition_field='net_payable',
                condition_operator=ConditionOperator.GT,
                condition_value='0',
                template=template,
                priority=10,
                is_active=True
            )
            self.stdout.write('    → Created trigger rule')
        else:
            self.stdout.write(f'  ○ Template already exists: {template.name}')
        
        return template

    def create_tender_template(self):
        """Create High Value Tender Approval workflow."""
        template, created = WorkflowTemplate.objects.get_or_create(
            name='High Value Tender Approval',
            module=WorkflowModule.TENDER,
            defaults={
                'description': 'Approval workflow for high-value tenders. '
                               'DA checks budget → SE scrutinizes → PD approves.',
                'is_active': True,
                'is_default': True
            }
        )
        
        if created:
            self.stdout.write(f'  ✓ Created template: {template.name}')
            
            steps = [
                {
                    'sequence': 1,
                    'role': 'DA',
                    'action_type': ActionType.VERIFY,
                    'action_label': 'Budget Check',
                    'can_revert': False,
                    'deadline_days': 2,
                    'remarks_required': True
                },
                {
                    'sequence': 2,
                    'role': 'SE',
                    'action_type': ActionType.RECOMMEND,
                    'action_label': 'Scrutiny',
                    'can_revert': True,
                    'deadline_days': 5,
                    'remarks_required': False
                },
                {
                    'sequence': 3,
                    'role': 'PD',
                    'action_type': ActionType.APPROVE,
                    'action_label': 'Administrative Approval',
                    'can_revert': True,
                    'deadline_days': 7,
                    'remarks_required': False
                }
            ]
            
            for step_data in steps:
                WorkflowStep.objects.create(template=template, **step_data)
                self.stdout.write(f'    → Step {step_data["sequence"]}: {step_data["action_label"]} ({step_data["role"]})')
            
            # Create trigger rule
            WorkflowTriggerRule.objects.create(
                name='Tender Default Trigger',
                module=WorkflowModule.TENDER,
                condition_field='estimated_value',
                condition_operator=ConditionOperator.GT,
                condition_value='0',
                template=template,
                priority=10,
                is_active=True
            )
            self.stdout.write('    → Created trigger rule')
        else:
            self.stdout.write(f'  ○ Template already exists: {template.name}')
        
        return template

    def create_variation_template(self):
        """Create Variation Order Approval workflow."""
        template, created = WorkflowTemplate.objects.get_or_create(
            name='Variation Order Approval',
            module=WorkflowModule.VARIATION,
            defaults={
                'description': 'Approval workflow for contract variations. '
                               'EE reviews → SE recommends → CE approves.',
                'is_active': True,
                'is_default': True
            }
        )
        
        if created:
            self.stdout.write(f'  ✓ Created template: {template.name}')
            
            steps = [
                {
                    'sequence': 1,
                    'role': 'EE',
                    'action_type': ActionType.REVIEW,
                    'action_label': 'Technical Review',
                    'can_revert': False,
                    'deadline_days': 5,
                    'remarks_required': True
                },
                {
                    'sequence': 2,
                    'role': 'SE',
                    'action_type': ActionType.RECOMMEND,
                    'action_label': 'Recommendation',
                    'can_revert': True,
                    'deadline_days': 5,
                    'remarks_required': False
                },
                {
                    'sequence': 3,
                    'role': 'CE',
                    'action_type': ActionType.SANCTION,
                    'action_label': 'Final Sanction',
                    'can_revert': True,
                    'deadline_days': 7,
                    'remarks_required': False
                }
            ]
            
            for step_data in steps:
                WorkflowStep.objects.create(template=template, **step_data)
                self.stdout.write(f'    → Step {step_data["sequence"]}: {step_data["action_label"]} ({step_data["role"]})')
            
            # Create trigger rule
            WorkflowTriggerRule.objects.create(
                name='Variation Default Trigger',
                module=WorkflowModule.VARIATION,
                condition_field='amount',
                condition_operator=ConditionOperator.GT,
                condition_value='0',
                template=template,
                priority=10,
                is_active=True
            )
            self.stdout.write('    → Created trigger rule')
        else:
            self.stdout.write(f'  ○ Template already exists: {template.name}')
        
        return template
