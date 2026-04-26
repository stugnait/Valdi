import os
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import BankConnection, Client, ManualCashBalance, Project


class BankConnectionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='integration-user',
            email='integration@example.com',
            password='safe-password-123',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @patch.dict(os.environ, {'BANK_TOKEN_ENCRYPTION_KEY': 'test-encryption-key'}, clear=False)
    def test_connect_masks_token_and_stores_encrypted_value(self):
        response = self.client.post(
            '/api/bank-connections/',
            {'provider': 'monobank', 'token': 'abcdefgh12345678'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload['token_masked'], 'abcd...5678')
        self.assertIn('connected_at', payload)
        self.assertIn('last_error', payload)
        self.assertIn('disabled_reason', payload)
        self.assertNotIn('encrypted_token', payload)
        self.assertNotIn('token', payload)

        connection = BankConnection.objects.get(created_by=self.user, provider='monobank')
        self.assertNotEqual(connection.encrypted_token, 'abcdefgh12345678')

    @patch.dict(os.environ, {'BANK_TOKEN_ENCRYPTION_KEY': 'test-encryption-key'}, clear=False)
    def test_exception_logging_redacts_sensitive_token(self):
        with self.assertLogs('workforce.views', level='WARNING') as captured:
            response = self.client.post(
                '/api/bank-connections/',
                {'provider': 'unknown-bank', 'token': 'super-secret-token'},
                format='json',
            )

        self.assertEqual(response.status_code, 400)
        joined_logs = '\n'.join(captured.output)
        self.assertIn('***REDACTED***', joined_logs)
        self.assertNotIn('super-secret-token', joined_logs)


class AnalyticsOverviewApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='analytics-user',
            email='analytics@example.com',
            password='safe-password-123',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_health_summary_payload(self):
        client = Client.objects.create(name='Acme', created_by=self.user)
        Project.objects.create(
            name='Acme Platform',
            client=client,
            created_by=self.user,
            status=Project.Status.ACTIVE,
            start_date='2026-01-01',
            end_date='2026-12-31',
            billing_model=Project.BillingModel.FIXED,
            revenue='10000.00',
            labor_cost='3500.00',
            direct_overheads='400.00',
        )

        response = self.client.get('/api/analytics/overview/')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn('health', payload)
        self.assertAlmostEqual(payload['health']['total_revenue'], 10000.0)
        self.assertIn('sankey', payload['health'])
        self.assertEqual(payload['health']['current_cash'], 0.0)

    def test_uses_manual_cash_balance_for_current_cash(self):
        ManualCashBalance.objects.create(updated_by=self.user, amount='12345.67')

        response = self.client.get('/api/analytics/overview/')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['health']['current_cash'], 12345.67)


class ManualCashBalanceApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='cash-user',
            email='cash@example.com',
            password='safe-password-123',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_default_value_when_not_configured(self):
        response = self.client.get('/api/analytics/manual-cash-balance/')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['amount'], 0.0)
        self.assertFalse(payload['is_configured'])

    def test_put_upserts_manual_cash_balance(self):
        response = self.client.put('/api/analytics/manual-cash-balance/', {'amount': '777.50'}, format='json')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['amount'], '777.50')
        self.assertTrue(payload['is_configured'])
        self.assertEqual(ManualCashBalance.objects.get(updated_by=self.user).amount, Decimal('777.50'))
