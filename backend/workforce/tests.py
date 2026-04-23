import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import BankConnection


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
