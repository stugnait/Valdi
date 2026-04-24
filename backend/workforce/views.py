import json
import logging
from decimal import Decimal

from django.db.models import Sum
from django.db import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from . import serializers as workforce_serializers
from .crypto import decrypt_token, encrypt_token, mask_token
from .models import (
    Team,
    Developer,
    Client,
    Project,
    Subscription,
    Invoice,
    TaxReport,
    AutomationRule,
    BankConnection,
    RecurringExpense,
    VariableExpense,
)
from .services.monobank import MonobankAPIError, MonobankRateLimitError, sync_accounts_and_statements

logger = logging.getLogger(__name__)
SENSITIVE_FIELDS = {'token', 'access_token', 'refresh_token', 'id_token', 'authorization'}


def _redact_sensitive(payload):
    if isinstance(payload, dict):
        sanitized = {}
        for key, value in payload.items():
            if str(key).lower() in SENSITIVE_FIELDS:
                sanitized[key] = '***REDACTED***'
            else:
                sanitized[key] = _redact_sensitive(value)
        return sanitized

    if isinstance(payload, list):
        return [_redact_sensitive(item) for item in payload]

    return payload


class SafeModelViewSet(ModelViewSet):
    migration_error_message = (
        'Таблиці для workforce ще не створені. '
        'Запусти `python manage.py migrate` для поточної БД і повтори запит.'
    )

    def handle_exception(self, exc):
        request_payload = {}
        if hasattr(self.request, 'data'):
            try:
                request_payload = _redact_sensitive(dict(self.request.data))
            except Exception:  # noqa: BLE001
                request_payload = {'body': 'unavailable'}

        logger.warning(
            'API exception on %s %s. payload=%s',
            self.request.method,
            self.request.path,
            json.dumps(request_payload, ensure_ascii=False),
            exc_info=exc,
        )

        if isinstance(exc, (OperationalError, ProgrammingError)):
            return Response(
                {'detail': self.migration_error_message},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)


class TeamViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.TeamSerializer
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
    serializer_class = workforce_serializers.DeveloperSerializer
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
    serializer_class = workforce_serializers.ClientSerializer
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
    serializer_class = workforce_serializers.ProjectSerializer
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
    serializer_class = workforce_serializers.SubscriptionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Subscription.objects.filter(created_by=self.request.user)
            .select_related('client', 'project')
            .order_by('-updated_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InvoiceViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.InvoiceSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Invoice.objects.filter(created_by=self.request.user)
            .select_related('project', 'client')
            .order_by('-issue_date', '-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaxReportViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.TaxReportSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return TaxReport.objects.filter(created_by=self.request.user).order_by('-year', '-quarter')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AutomationRuleViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.AutomationRuleSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return AutomationRule.objects.filter(created_by=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class BankConnectionViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.BankConnectionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return BankConnection.objects.filter(created_by=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        connection = serializer.save(created_by=self.request.user)
        if connection.provider == BankConnection.Provider.MONOBANK:
            self._sync_monobank_connection(connection)

    @action(detail=True, methods=['post'], url_path='sync')
    def sync(self, request, pk=None):
        connection = self.get_object()
        if connection.provider == BankConnection.Provider.MONOBANK:
            self._sync_monobank_connection(connection)
        else:
            connection.status = BankConnection.Status.CONNECTED
            connection.last_sync = timezone.now()
            connection.last_error = ''
            connection.save(update_fields=['status', 'last_sync', 'last_error', 'updated_at'])
        serializer = self.get_serializer(connection)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reconnect')
    def reconnect(self, request, pk=None):
        connection = self.get_object()
        token = str(request.data.get('token', '')).strip()
        if not token:
            raise ValidationError({'token': 'Token is required.'})

        connection.encrypted_token = encrypt_token(token)
        connection.token_masked = mask_token(token)
        connection.status = BankConnection.Status.CONNECTED
        connection.last_error = ''
        connection.disabled_reason = ''
        connection.save(
            update_fields=[
                'encrypted_token',
                'token_masked',
                'status',
                'last_error',
                'disabled_reason',
                'updated_at',
            ]
        )
        if connection.provider == BankConnection.Provider.MONOBANK:
            self._sync_monobank_connection(connection)
        serializer = self.get_serializer(connection)
        return Response(serializer.data)

    def _sync_monobank_connection(self, connection):
        connection.status = BankConnection.Status.SYNCING
        connection.last_error = ''
        connection.save(update_fields=['status', 'last_error', 'updated_at'])

        try:
            token = decrypt_token(connection.encrypted_token)
            sync_results = sync_accounts_and_statements(
                user=connection.created_by,
                token=token,
            )
            self._sync_variable_expenses_from_monobank(
                user=connection.created_by,
                sync_results=sync_results,
            )
        except MonobankRateLimitError as exc:
            connection.status = BankConnection.Status.ERROR
            retry_after = exc.retry_after or 60
            connection.last_error = f'Rate limit exceeded. Retry in ~{retry_after} sec.'
            connection.last_sync = timezone.now()
            connection.save(update_fields=['status', 'last_error', 'last_sync', 'updated_at'])
            raise Throttled(
                wait=retry_after,
                detail='Monobank тимчасово обмежив запити. Спробуй повторити синк трохи пізніше.',
            ) from exc
        except MonobankAPIError as exc:
            connection.status = BankConnection.Status.ERROR
            connection.last_error = str(exc)
            connection.last_sync = timezone.now()
            connection.save(update_fields=['status', 'last_error', 'last_sync', 'updated_at'])
            raise ValidationError({'detail': 'Не вдалося синхронізувати Monobank. Перевір токен та повтори спробу.'}) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception('Unexpected Monobank sync error for connection=%s', connection.id)
            connection.status = BankConnection.Status.ERROR
            connection.last_error = str(exc)
            connection.last_sync = timezone.now()
            connection.save(update_fields=['status', 'last_error', 'last_sync', 'updated_at'])
            raise ValidationError({'detail': 'Під час синхронізації сталася неочікувана помилка.'}) from exc

        connection.status = BankConnection.Status.CONNECTED
        connection.last_sync = timezone.now()
        connection.last_error = ''
        connection.disabled_reason = ''
        connection.save(update_fields=['status', 'last_sync', 'last_error', 'disabled_reason', 'updated_at'])

    @staticmethod
    def _sync_variable_expenses_from_monobank(*, user, sync_results):
        for result in sync_results:
            debit_transactions = result.account.transactions.filter(direction=result.account.transactions.model.Direction.DEBIT)
            for transaction in debit_transactions:
                VariableExpense.objects.update_or_create(
                    created_by=user,
                    external_tx_id=transaction.external_tx_id,
                    defaults={
                        'name': transaction.description[:180] or transaction.counterparty[:180] or 'Card transaction',
                        'amount': abs(transaction.amount),
                        'currency': transaction.currency,
                        'category': transaction.category or 'other',
                        'source': VariableExpense.Source.MONOBANK,
                        'expense_date': transaction.occurred_at.date(),
                        'description': transaction.description,
                        'allocation_type': VariableExpense.AllocationType.NONE,
                    },
                )


class RecurringExpenseViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.RecurringExpenseSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            RecurringExpense.objects.filter(created_by=self.request.user)
            .select_related('team', 'project')
            .order_by('-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class VariableExpenseViewSet(SafeModelViewSet):
    serializer_class = workforce_serializers.VariableExpenseSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            VariableExpense.objects.filter(created_by=self.request.user)
            .select_related('assignee', 'team', 'project')
            .order_by('-expense_date', '-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnalyticsOverviewAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    @staticmethod
    def _monthly_amount(expense):
        if expense.cycle == RecurringExpense.Cycle.MONTHLY:
            return expense.amount
        if expense.cycle == RecurringExpense.Cycle.QUARTERLY:
            return expense.amount / Decimal('3')
        if expense.cycle == RecurringExpense.Cycle.YEARLY:
            return expense.amount / Decimal('12')
        return Decimal('0')

    def get(self, request):
        user = request.user
        projects = Project.objects.filter(created_by=user).select_related('client')
        recurring_expenses = list(RecurringExpense.objects.filter(created_by=user))
        variable_expenses = list(VariableExpense.objects.filter(created_by=user))
        developers = Developer.objects.filter(created_by=user, is_active=True)

        total_revenue = projects.aggregate(total=Sum('revenue'))['total'] or Decimal('0')
        total_labor_cost = projects.aggregate(total=Sum('labor_cost'))['total'] or Decimal('0')
        monthly_recurring = sum((self._monthly_amount(expense) for expense in recurring_expenses), Decimal('0'))
        variable_total = sum((expense.amount for expense in variable_expenses), Decimal('0'))
        monthly_variable = variable_total / Decimal('3') if variable_expenses else Decimal('0')
        total_monthly_costs = total_labor_cost + monthly_recurring + monthly_variable
        tax_reserve = total_revenue * Decimal('0.05')
        monthly_esv = Decimal('1760') / Decimal('3')
        equipment_value = sum(
            (expense.amount for expense in variable_expenses if expense.category == 'equipment'),
            Decimal('0'),
        )
        monthly_depreciation = equipment_value / Decimal('36') if equipment_value else Decimal('0')
        ebitda = total_revenue - total_labor_cost - monthly_recurring - monthly_variable
        net_profit = ebitda - tax_reserve - monthly_esv - monthly_depreciation
        current_cash = Decimal('45000')
        monthly_burn = total_monthly_costs + tax_reserve + monthly_esv
        runway_months = current_cash / monthly_burn if monthly_burn > 0 else Decimal('0')
        profit_margin = (net_profit / total_revenue) * Decimal('100') if total_revenue > 0 else Decimal('0')

        sources = []
        for project in projects.filter(status__in=[Project.Status.ACTIVE, Project.Status.FINISHED]):
            if project.revenue <= 0:
                continue
            sources.append(
                {
                    'id': project.id,
                    'name': project.client.name,
                    'amount': float(project.revenue),
                }
            )

        total_team_rate = developers.aggregate(total=Sum('hourly_rate'))['total'] or Decimal('0')
        destinations = [
            {'id': 'labor', 'name': 'Salaries', 'amount': float(total_labor_cost), 'color': '#3B82F6'},
            {
                'id': 'overhead',
                'name': 'Overheads',
                'amount': float(monthly_recurring + monthly_variable),
                'color': '#F59E0B',
            },
            {'id': 'taxes', 'name': 'Taxes & ESV', 'amount': float(tax_reserve + monthly_esv), 'color': '#EF4444'},
            {'id': 'profit', 'name': 'Net Profit', 'amount': float(max(net_profit, Decimal('0'))), 'color': '#10B981'},
        ]
        cost_structure = []
        base_total = total_monthly_costs if total_monthly_costs > 0 else Decimal('1')
        for label, amount, color in [
            ('Labor Costs', total_labor_cost, '#3B82F6'),
            ('Recurring Overheads', monthly_recurring, '#F59E0B'),
            ('Variable Expenses', monthly_variable, '#8B5CF6'),
            ('Taxes & ESV', tax_reserve + monthly_esv, '#EF4444'),
        ]:
            cost_structure.append(
                {
                    'label': label,
                    'amount': float(amount),
                    'percent': float((amount / base_total) * Decimal('100')),
                    'color': color,
                }
            )

        payload = {
            'health': {
                'total_revenue': float(total_revenue),
                'total_labor_cost': float(total_labor_cost),
                'monthly_recurring': float(monthly_recurring),
                'monthly_variable': float(monthly_variable),
                'total_monthly_costs': float(total_monthly_costs),
                'tax_reserve': float(tax_reserve),
                'monthly_esv': float(monthly_esv),
                'monthly_depreciation': float(monthly_depreciation),
                'ebitda': float(ebitda),
                'net_profit': float(net_profit),
                'current_cash': float(current_cash),
                'monthly_burn': float(monthly_burn),
                'runway_months': float(runway_months),
                'profit_margin': float(profit_margin),
                'sankey': {
                    'sources': sorted(sources, key=lambda x: x['amount'], reverse=True),
                    'destinations': destinations,
                    'total_income': float(sum(item['amount'] for item in sources)),
                },
                'cost_structure': cost_structure,
                'meta': {
                    'projects_count': projects.count(),
                    'developers_count': developers.count(),
                    'active_hourly_total': float(total_team_rate),
                },
            }
        }
        return Response(payload)
