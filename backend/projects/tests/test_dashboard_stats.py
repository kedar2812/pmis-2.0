from rest_framework.test import APITestCase
from django.urls import reverse
from projects.models import Project
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class DashboardStatsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)

    def test_earned_value_calculation_bug(self):
        # Create Project 1: Budget 100, Progress 100%
        # EV should be 100
        Project.objects.create(
            name="P1",
            budget=Decimal('100.00'),
            progress=100.0,
            status='In Progress',
            spent=Decimal('0.00'),
            earned_value=Decimal('100.00')
        )

        # Create Project 2: Budget 1000, Progress 0%
        # EV should be 0
        Project.objects.create(
            name="P2",
            budget=Decimal('1000.00'),
            progress=0.0,
            status='In Progress',
            spent=Decimal('0.00'),
            earned_value=Decimal('0.00')
        )

        # Total EV should be 100.0

        url = reverse('dashboard-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        earned_value_metrics = data['earned_value']
        calculated_ev = earned_value_metrics['earned_value']

        # With the bug:
        # Total Budget = 1100
        # Avg Progress = 50%
        # Buggy EV = 1100 * 0.5 = 550

        self.assertEqual(calculated_ev, 100.0, f"Expected EV 100.0, got {calculated_ev}")
