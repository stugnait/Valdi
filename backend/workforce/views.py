from django.db import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from urllib import error as url_error, parse as url_parse, request as url_request
import hashlib
import json
from datetime import datetime, timedelta

from .models import (
    Team,
    Developer,
    Client,
    Project,
    Subscription,
    MonobankIntegration,
    MonobankAccount,
    MonobankOperation,
)
from .serializers import (
    TeamSerializer,
    DeveloperSerializer,
    ClientSerializer,
    ProjectSerializer,
    SubscriptionSerializer,
    MonobankConnectSerializer,
    MonobankIntegrationSerializer,
    MonobankAccountSerializer,
    MonobankTrackingPatchSerializer,
)


class SafeModelViewSet(ModelViewSet):
    migration_error_message = (
        'Таблиці для workforce ще не створені. '
        'Запусти `python manage.py migrate` для поточної БД і повтори запит.'
    )

    def handle_exception(self, exc):
        if isinstance(exc, (OperationalError, ProgrammingError)):
            return Response(
                {'detail': self.migration_error_message},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)


class TeamViewSet(SafeModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Team.objects.filter(created_by=self.request.user)
            .prefetch_related('memberships__developer')
            .order_by('name')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DeveloperViewSet(SafeModelViewSet):
    serializer_class = DeveloperSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Developer.objects.filter(created_by=self.request.user)
            .prefetch_related('memberships__team')
            .order_by('full_name')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ClientViewSet(SafeModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Client.objects.filter(created_by=self.request.user)
            .prefetch_related('projects')
            .order_by('name')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProjectViewSet(SafeModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Project.objects.filter(created_by=self.request.user)
            .select_related('client')
            .order_by('-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SubscriptionViewSet(SafeModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Subscription.objects.filter(created_by=self.request.user)
            .select_related('client', 'project')
            .order_by('-updated_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MonobankAPIException(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'Помилка інтеграції з Monobank.'
    default_code = 'monobank_error'


class IntegrationViewSet(SafeModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = MonobankIntegrationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return (
            MonobankIntegration.objects.filter(created_by=self.request.user)
            .prefetch_related('accounts')
            .order_by('-updated_at')
        )

    def partial_update(self, request, *args, **kwargs):
        integration = self.get_object()
        serializer = MonobankTrackingPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = integration.accounts.filter(account_id=serializer.validated_data['account_id']).first()
        if not account:
            raise ValidationError({'account_id': 'Рахунок не знайдено для цієї інтеграції.'})
        account.is_tracking_enabled = serializer.validated_data['is_tracking_enabled']
        account.save(update_fields=['is_tracking_enabled', 'updated_at'])
        return Response(MonobankIntegrationSerializer(integration, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        integration = self.get_object()
        integration.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='monobank/connect')
    def connect(self, request):
        serializer = MonobankConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_info = self._fetch_client_info(serializer.validated_data['token'])
        integration = MonobankIntegration.objects.create(
            created_by=request.user,
            token=serializer.validated_data['token'],
            name=serializer.validated_data.get('name', 'Monobank'),
            is_active=True,
            last_synced_at=timezone.now(),
        )
        self._sync_accounts(integration, client_info.get('accounts', []))
        return Response(
            MonobankIntegrationSerializer(integration, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        integration = self.get_object()
        client_info = self._fetch_client_info(integration.token)
        synced_accounts = self._sync_accounts(integration, client_info.get('accounts', []))
        synced_operations = self._sync_operations(integration)
        integration.last_synced_at = timezone.now()
        integration.save(update_fields=['last_synced_at', 'updated_at'])
        return Response(
            {
                'detail': 'Синхронізацію виконано успішно.',
                'synced_accounts': synced_accounts,
                'synced_operations': synced_operations,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'])
    def accounts(self, request, pk=None):
        integration = self.get_object()
        serializer = MonobankAccountSerializer(integration.accounts.order_by('account_id'), many=True)
        return Response(serializer.data)

    def _fetch_client_info(self, token: str) -> dict:
        return self._monobank_request('/personal/client-info', token=token)

    def _sync_accounts(self, integration: MonobankIntegration, accounts: list[dict]) -> int:
        incoming_ids = []
        for item in accounts:
            account_id = item.get('id')
            if not account_id:
                continue
            incoming_ids.append(account_id)
            MonobankAccount.objects.update_or_create(
                integration=integration,
                account_id=account_id,
                defaults={
                    'iban': item.get('iban', ''),
                    'currency_code': item.get('currencyCode', 0),
                    'balance': item.get('balance', 0),
                    'cashback_type': item.get('cashbackType', ''),
                    'type': item.get('type', ''),
                    'masked_pan': item.get('maskedPan', []),
                    'raw_data': item,
                },
            )

        integration.accounts.exclude(account_id__in=incoming_ids).delete()
        return len(incoming_ids)

    def _sync_operations(self, integration: MonobankIntegration) -> int:
        now_ts = int(timezone.now().timestamp())
        from_ts = int((timezone.now() - timedelta(days=31)).timestamp())
        synced = 0
        for account in integration.accounts.filter(is_tracking_enabled=True):
            statement = self._monobank_request(
                f'/personal/statement/{url_parse.quote(account.account_id)}/{from_ts}/{now_ts}',
                token=integration.token,
            )
            for item in statement:
                operation_id = str(item.get('id') or self._build_fallback_operation_id(item))
                operation_time = datetime.fromtimestamp(item.get('time', now_ts), tz=timezone.utc)
                _, created = MonobankOperation.objects.update_or_create(
                    account=account,
                    operation_id=operation_id,
                    defaults={
                        'operation_time': operation_time,
                        'amount': item.get('amount', 0),
                        'description': item.get('description', ''),
                        'mcc': item.get('mcc'),
                        'raw_data': item,
                    },
                )
                if created:
                    synced += 1
        return synced

    def _build_fallback_operation_id(self, item: dict) -> str:
        identity = f"{item.get('time','')}-{item.get('amount','')}-{item.get('description','')}"
        return hashlib.sha256(identity.encode('utf-8')).hexdigest()

    def _monobank_request(self, path: str, token: str):
        req = url_request.Request(
            f'https://api.monobank.ua{path}',
            headers={'X-Token': token, 'Content-Type': 'application/json'},
            method='GET',
        )
        try:
            with url_request.urlopen(req, timeout=15) as response:
                body = response.read().decode('utf-8')
                return json.loads(body) if body else {}
        except url_error.HTTPError as exc:
            if exc.code == 401:
                raise ValidationError({'token': 'Monobank відхилив токен (401 Unauthorized).'})
            if exc.code == 429:
                raise MonobankAPIException(detail='Monobank тимчасово обмежив запити (429 Too Many Requests).')
            if exc.code >= 500:
                raise MonobankAPIException(detail='Monobank недоступний (5xx). Спробуйте пізніше.')
            raise MonobankAPIException(detail=f'Помилка Monobank API: HTTP {exc.code}.')
        except (url_error.URLError, json.JSONDecodeError) as exc:
            raise MonobankAPIException(detail=f'Не вдалося звернутися до Monobank API: {exc}')
