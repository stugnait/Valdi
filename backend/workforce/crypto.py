import base64
import hashlib
import os

from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured


def _get_fernet() -> Fernet:
    raw_key = os.getenv('BANK_TOKEN_ENCRYPTION_KEY', '').strip()
    if not raw_key:
        raise ImproperlyConfigured('BANK_TOKEN_ENCRYPTION_KEY env var is required for token encryption.')

    digest = hashlib.sha256(raw_key.encode('utf-8')).digest()
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode('utf-8')).decode('utf-8')


def decrypt_token(encrypted_token: str) -> str:
    return _get_fernet().decrypt(encrypted_token.encode('utf-8')).decode('utf-8')


def mask_token(token: str) -> str:
    if len(token) <= 8:
        return '•' * len(token)
    return f'{token[:4]}...{token[-4:]}'
