import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from urllib import error, parse, request

from django.db import transaction
from django.utils import timezone as dj_timezone

from workforce.models import BankAccount, BankTransaction

logger = logging.getLogger(__name__)


_CURRENCY_NUMERIC_MAP: dict[int, str] = {
    840: 'USD',
    978: 'EUR',
    980: 'UAH',
    826: 'GBP',
    985: 'PLN',
}

_MCC_CATEGORY_MAP: dict[range, str] = {
    range(5411, 5412): 'groceries',
    range(5811, 5815): 'restaurants',
    range(5921, 5922): 'alcohol',
    range(5541, 5543): 'fuel',
    range(4111, 4122): 'transport',
    range(4812, 4815): 'telecom',
    range(4900, 4999): 'utilities',
    range(5200, 5300): 'home',
    range(5732, 5736): 'software',
    range(7372, 7373): 'it_services',
}

_DESCRIPTION_HINTS: dict[str, str] = {
    'salary': 'salary',
    'payroll': 'salary',
    'tax': 'taxes',
    'aws': 'cloud',
    'google cloud': 'cloud',
    'azure': 'cloud',
    'stripe': 'payment_processing',
    'hosting': 'hosting',
    'domain': 'hosting',
    'office': 'office',
    'rent': 'rent',
    'uber': 'transport',
    'bolt': 'transport',
}


class MonobankAPIError(Exception):
    pass


@dataclass
class SyncResult:
    account: BankAccount
    transactions_created: int
    transactions_updated: int
    next_cursor: int


class MonobankClient:
    base_url = 'https://api.monobank.ua'

    def __init__(self, token: str, timeout: int = 20, max_retries: int = 5) -> None:
        self.token = token
        self.timeout = timeout
        self.max_retries = max_retries

    def get_client_info(self) -> dict[str, Any]:
        return self._request('GET', '/personal/client-info')

    def get_statement(self, account_id: str, from_ts: int, to_ts: int | None = None) -> list[dict[str, Any]]:
        path = f'/personal/statement/{parse.quote(account_id)}/{from_ts}'
        if to_ts is not None:
            path = f'{path}/{to_ts}'
        return self._request('GET', path)

    def _request(self, method: str, path: str) -> Any:
        url = f'{self.base_url}{path}'
        req = request.Request(
            url,
            method=method,
            headers={
                'X-Token': self.token,
                'Accept': 'application/json',
            },
        )

        for attempt in range(1, self.max_retries + 1):
            try:
                with request.urlopen(req, timeout=self.timeout) as response:
                    payload = response.read().decode('utf-8')
                    return json.loads(payload) if payload else {}
            except error.HTTPError as exc:
                if exc.code == 429 and attempt < self.max_retries:
                    retry_after = exc.headers.get('Retry-After')
                    delay = int(retry_after) if retry_after and retry_after.isdigit() else 2 ** (attempt - 1)
                    time.sleep(delay)
                    continue

                message = exc.read().decode('utf-8', errors='ignore')
                raise MonobankAPIError(f'Monobank request failed ({exc.code}): {message}') from exc
            except error.URLError as exc:
                if attempt < self.max_retries:
                    time.sleep(2 ** (attempt - 1))
                    continue
                raise MonobankAPIError(f'Monobank is unreachable: {exc}') from exc

        raise MonobankAPIError('Monobank request exhausted retries')


def sync_accounts_and_statements(
    *,
    user,
    token: str,
    since_cursor: int | None = None,
    until: datetime | None = None,
) -> list[SyncResult]:
    """Fetches Monobank accounts + statements and upserts local models.

    `since_cursor` is Unix seconds (UTC). If omitted, account.sync_cursor is used.
    """
    client = MonobankClient(token=token)
    info = client.get_client_info()
    accounts_data = info.get('accounts', [])
    account_holder = info.get('name', '')

    now_utc = (until or dj_timezone.now()).astimezone(timezone.utc)
    sync_results: list[SyncResult] = []

    for account_data in accounts_data:
        account = _upsert_bank_account(
            user=user,
            account_data=account_data,
            holder=account_holder,
        )

        from_ts = since_cursor or account.sync_cursor or int((now_utc - timedelta(days=31)).timestamp())
        to_ts = int(now_utc.timestamp())
        statements = _fetch_statement_chunks(client=client, account=account, from_ts=from_ts, to_ts=to_ts)

        created_count = 0
        updated_count = 0
        max_time = from_ts

        with transaction.atomic():
            for item in statements:
                tx_time = int(item.get('time', from_ts))
                max_time = max(max_time, tx_time)
                _, created = _upsert_transaction(account=account, tx_data=item)
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            account.sync_cursor = max_time
            account.last_synced_at = dj_timezone.now()
            account.save(update_fields=['sync_cursor', 'last_synced_at', 'updated_at'])

        sync_results.append(
            SyncResult(
                account=account,
                transactions_created=created_count,
                transactions_updated=updated_count,
                next_cursor=max_time,
            )
        )

    return sync_results


def _fetch_statement_chunks(*, client: MonobankClient, account: BankAccount, from_ts: int, to_ts: int) -> list[dict[str, Any]]:
    """Monobank statement endpoint supports max ~31 day range, so chunk big periods."""
    chunk_seconds = 31 * 24 * 60 * 60
    cursor = from_ts
    output: list[dict[str, Any]] = []

    while cursor <= to_ts:
        window_end = min(cursor + chunk_seconds, to_ts)
        output.extend(client.get_statement(account.external_account_id, cursor, window_end))
        cursor = window_end + 1

    return output


def _upsert_bank_account(*, user, account_data: dict[str, Any], holder: str) -> BankAccount:
    currency = normalize_currency(account_data.get('currencyCode'))
    balance = minor_to_major(account_data.get('balance', 0))

    account, _ = BankAccount.objects.update_or_create(
        provider=BankAccount.Provider.MONOBANK,
        external_account_id=account_data['id'],
        created_by=user,
        defaults={
            'iban': account_data.get('iban', ''),
            'masked_pan': ','.join(account_data.get('maskedPan', [])),
            'holder': holder,
            'currency': currency,
            'timezone': 'UTC',
            'balance': balance,
            'raw_data': account_data,
        },
    )
    return account


def _upsert_transaction(*, account: BankAccount, tx_data: dict[str, Any]) -> tuple[BankTransaction, bool]:
    normalized = map_transaction(account=account, tx_data=tx_data)
    tx, created = BankTransaction.objects.update_or_create(
        external_tx_id=normalized['external_tx_id'],
        defaults=normalized,
    )
    return tx, created


def map_transaction(*, account: BankAccount, tx_data: dict[str, Any]) -> dict[str, Any]:
    mcc = tx_data.get('mcc')
    description = tx_data.get('description') or ''
    amount_major = minor_to_major(tx_data.get('amount', 0))
    currency = normalize_currency(tx_data.get('currencyCode'))
    occurred_at = normalize_timestamp(tx_data.get('time'))

    return {
        'bank_account': account,
        'external_tx_id': str(tx_data['id']),
        'occurred_at': occurred_at,
        'amount': amount_major,
        'currency': currency,
        'description': description[:255],
        'mcc': mcc,
        'counterparty': (tx_data.get('merchantName') or '')[:255],
        'direction': BankTransaction.Direction.DEBIT if amount_major < 0 else BankTransaction.Direction.CREDIT,
        'category': auto_category(mcc=mcc, description=description),
        'category_source': 'auto',
        'raw_data': tx_data,
    }


def normalize_timestamp(timestamp_value: int | None) -> datetime:
    if not timestamp_value:
        return dj_timezone.now().astimezone(timezone.utc)
    return datetime.fromtimestamp(int(timestamp_value), tz=timezone.utc)


def normalize_currency(currency_code: int | str | None) -> str:
    if currency_code is None:
        return 'UAH'
    if isinstance(currency_code, str) and len(currency_code) == 3:
        return currency_code.upper()
    return _CURRENCY_NUMERIC_MAP.get(int(currency_code), 'UAH')


def minor_to_major(value: int | str | Decimal) -> Decimal:
    return (Decimal(str(value)) / Decimal('100')).quantize(Decimal('0.01'))


def auto_category(*, mcc: int | None, description: str) -> str:
    if mcc is not None:
        for mcc_range, category in _MCC_CATEGORY_MAP.items():
            if mcc in mcc_range:
                return category

    lowered = description.lower()
    for hint, category in _DESCRIPTION_HINTS.items():
        if hint in lowered:
            return category

    return 'uncategorized'
