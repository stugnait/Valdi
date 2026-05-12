from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from .models import (
    Team,
    Developer,
    TeamMembership,
    Client,
    Project,
    Subscription,
    SubscriptionPayment,
    Invoice,
    TaxReport,
    AutomationRule,
    BankConnection,
    RecurringExpense,
    VariableExpense,
    ManualCashBalance,
)


class TeamMembershipSerializer(serializers.ModelSerializer):
    developer_name = serializers.CharField(source='developer.full_name', read_only=True)
    developer_email = serializers.CharField(source='developer.email', read_only=True)

    class Meta:
        model = TeamMembership
        fields = ('id', 'developer', 'developer_name', 'developer_email', 'allocation')


class TeamSerializer(serializers.ModelSerializer):
    memberships = TeamMembershipSerializer(many=True, required=False)

    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'created_at', 'updated_at', 'memberships')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        memberships_data = validated_data.pop('memberships', [])
        team = Team.objects.create(**validated_data)
        self._sync_memberships(team, memberships_data)
        return team

    def update(self, instance, validated_data):
        memberships_data = validated_data.pop('memberships', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if memberships_data is not None:
            self._sync_memberships(instance, memberships_data)

        return instance

    def _sync_memberships(self, team: Team, memberships_data):
        user = self.context['request'].user
        incoming = []
        for item in memberships_data:
            developer = item['developer']
            if developer.created_by_id != user.id:
                raise serializers.ValidationError('Не можна додавати девелопера іншого користувача.')

            membership, _ = TeamMembership.objects.update_or_create(
                team=team,
                developer=developer,
                defaults={'allocation': item.get('allocation', 100)},
            )
            incoming.append(membership.developer_id)

        if memberships_data is not None:
            team.memberships.exclude(developer_id__in=incoming).delete()


class DeveloperSerializer(serializers.ModelSerializer):
    teams = serializers.SerializerMethodField()

    class Meta:
        model = Developer
        fields = (
            'id',
            'full_name',
            'email',
            'role',
            'hourly_rate',
            'is_active',
            'created_at',
            'updated_at',
            'teams',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'teams')

    def get_teams(self, obj):
        return [
            {
                'id': membership.team_id,
                'name': membership.team.name,
                'allocation': membership.allocation,
            }
            for membership in obj.memberships.select_related('team').all()
        ]


class ClientSerializer(serializers.ModelSerializer):
    active_projects = serializers.SerializerMethodField()
    total_projects = serializers.SerializerMethodField()
    total_revenue_computed = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    margin_percent = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = (
            'id',
            'name',
            'company_name',
            'contact_person',
            'email',
            'phone',
            'country',
            'website',
            'notes',
            'status',
            'total_revenue',
            'active_projects',
            'total_projects',
            'total_revenue_computed',
            'total_cost',
            'profit',
            'margin_percent',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'active_projects', 'total_projects', 'total_revenue_computed', 'total_cost', 'profit', 'margin_percent')

    def get_active_projects(self, obj):
        return obj.projects.filter(status=Project.Status.ACTIVE).count()



    def get_total_projects(self, obj):
        return obj.projects.count()

    def _project_finance(self, obj):
        projects_qs = obj.projects.filter(created_by=obj.created_by)
        project_sums = projects_qs.aggregate(
            revenue=Sum('revenue'),
            labor=Sum('labor_cost'),
            overheads=Sum('direct_overheads'),
        )
        invoice_paid_sum = obj.invoices.filter(created_by=obj.created_by, status='paid').aggregate(total=Sum('amount'))['total']

        project_revenue = project_sums.get('revenue') or Decimal('0')
        total_revenue = invoice_paid_sum if invoice_paid_sum is not None else project_revenue
        total_cost = (project_sums.get('labor') or Decimal('0')) + (project_sums.get('overheads') or Decimal('0'))
        profit = total_revenue - total_cost
        margin_percent = (profit / total_revenue * Decimal('100')) if total_revenue else Decimal('0')
        return total_revenue, total_cost, profit, margin_percent

    def get_total_revenue_computed(self, obj):
        return self._project_finance(obj)[0]

    def get_total_cost(self, obj):
        return self._project_finance(obj)[1]

    def get_profit(self, obj):
        return self._project_finance(obj)[2]

    def get_margin_percent(self, obj):
        return round(float(self._project_finance(obj)[3]), 2)

    def validate(self, attrs):
        data = attrs.copy()
        if self.instance:
            for key in ('name', 'company_name', 'contact_person', 'email', 'phone', 'country', 'status'):
                data[key] = data.get(key, getattr(self.instance, key, ''))

        required_errors = {}
        for key, message in {
            'company_name': 'Введіть назву клієнта',
            'contact_person': 'Введіть контактну особу',
            'status': 'Оберіть статус',
        }.items():
            if not str(data.get(key, '')).strip():
                required_errors[key] = message

        if required_errors:
            raise serializers.ValidationError(required_errors)


        if not str(data.get('name', '')).strip():
            company_name = str(data.get('company_name', '')).strip()
            if company_name:
                attrs['name'] = company_name

        email = str(data.get('email', '')).strip()
        phone = str(data.get('phone', '')).strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        status_value = str(data.get('status', '')).strip()

        import re
        if email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            raise serializers.ValidationError({'email': 'Введіть коректний Email'})
        if phone and not re.match(r'^\+?[1-9]\d{7,14}$', phone):
            raise serializers.ValidationError({'phone': 'Введіть коректний номер телефону'})
        allowed_statuses = {choice[0] for choice in Client.Status.choices}
        if status_value not in allowed_statuses:
            raise serializers.ValidationError({'status': 'Оберіть статус'})

        if not email and not phone:
            raise serializers.ValidationError({'non_field_errors': 'Вкажіть хоча б один спосіб зв’язку'})

        return attrs

class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'name',
            'client',
            'client_name',
            'status',
            'start_date',
            'end_date',
            'billing_model',
            'currency',
            'total_contract_value',
            'client_hourly_rate',
            'monthly_cap',
            'billing_cycle',
            'revenue',
            'labor_cost',
            'direct_overheads',
            'buffer_percent',
            'tax_reserve_percent',
            'team',
            'team_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'client_name', 'team_name')

    def validate_client(self, value):
        user = self.context['request'].user
        if value.created_by_id != user.id:
            raise serializers.ValidationError('Не можна використовувати клієнта іншого користувача.')
        return value

    def validate_team(self, value):
        if value is None:
            return value
        user = self.context['request'].user
        if value.created_by_id != user.id:
            raise serializers.ValidationError('Не можна використовувати команду іншого користувача.')
        return value

    def _team_monthly_cost(self, team):
        from decimal import Decimal
        total = Decimal('0')
        memberships = team.memberships.select_related('developer').all()
        for membership in memberships:
            rate = membership.developer.hourly_rate or Decimal('0')
            allocation = Decimal(membership.allocation or 0) / Decimal('100')
            total += rate * Decimal('160') * allocation
        return total

    def create(self, validated_data):
        labor_cost = validated_data.get('labor_cost')
        team = validated_data.get('team')
        if team and (labor_cost is None or labor_cost == 0):
            validated_data['labor_cost'] = self._team_monthly_cost(team)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        labor_cost = validated_data.get('labor_cost', instance.labor_cost)
        team = validated_data.get('team', instance.team)
        if team and (labor_cost is None or labor_cost == 0):
            validated_data['labor_cost'] = self._team_monthly_cost(team)
        return super().update(instance, validated_data)


class SubscriptionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id',
            'client',
            'client_name',
            'project',
            'project_name',
            'plan_name',
            'description',
            'status',
            'amount',
            'amount_type',
            'estimated_amount',
            'monthly_actual_amounts',
            'currency',
            'billing_cycle',
            'start_date',
            'next_billing_date',
            'end_date',
            'hours_included',
            'features',
            'total_paid',
            'confirmed_at',
            'confirmed_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'client_name', 'project_name')


    def get_total_projects(self, obj):
        return obj.projects.count()

    def _project_finance(self, obj):
        projects_qs = obj.projects.filter(created_by=obj.created_by)
        project_sums = projects_qs.aggregate(
            revenue=Sum('revenue'),
            labor=Sum('labor_cost'),
            overheads=Sum('direct_overheads'),
        )
        invoice_paid_sum = obj.invoices.filter(created_by=obj.created_by, status='paid').aggregate(total=Sum('amount'))['total']

        project_revenue = project_sums.get('revenue') or Decimal('0')
        total_revenue = invoice_paid_sum if invoice_paid_sum is not None else project_revenue
        total_cost = (project_sums.get('labor') or Decimal('0')) + (project_sums.get('overheads') or Decimal('0'))
        profit = total_revenue - total_cost
        margin_percent = (profit / total_revenue * Decimal('100')) if total_revenue else Decimal('0')
        return total_revenue, total_cost, profit, margin_percent

    def get_total_revenue_computed(self, obj):
        return self._project_finance(obj)[0]

    def get_total_cost(self, obj):
        return self._project_finance(obj)[1]

    def get_profit(self, obj):
        return self._project_finance(obj)[2]

    def get_margin_percent(self, obj):
        return round(float(self._project_finance(obj)[3]), 2)

    def validate(self, attrs):
        user = self.context['request'].user
        client = attrs.get('client') or getattr(self.instance, 'client', None)
        project = attrs.get('project') if 'project' in attrs else getattr(self.instance, 'project', None)

        if client and client.created_by_id != user.id:
            raise serializers.ValidationError({'client': 'Не можна використовувати клієнта іншого користувача.'})

        if project:
            if project.created_by_id != user.id:
                raise serializers.ValidationError({'project': 'Не можна використовувати проєкт іншого користувача.'})
            if client and project.client_id != client.id:
                raise serializers.ValidationError({'project': 'Проєкт має належати вибраному клієнту.'})

        return attrs


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    subscription_plan_name = serializers.CharField(source='subscription.plan_name', read_only=True)
    client_name = serializers.CharField(source='subscription.client.name', read_only=True)

    class Meta:
        model = SubscriptionPayment
        fields = (
            'id',
            'subscription',
            'subscription_plan_name',
            'client_name',
            'amount',
            'currency',
            'status',
            'payment_date',
            'due_date',
            'invoice_number',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'created_at',
            'updated_at',
            'subscription_plan_name',
            'client_name',
        )

    def validate_subscription(self, value):
        user = self.context['request'].user
        if value.created_by_id != user.id:
            raise serializers.ValidationError('Не можна використовувати підписку іншого користувача.')
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Invoice
        fields = (
            'id',
            'number',
            'project',
            'project_name',
            'client',
            'client_name',
            'amount',
            'currency',
            'status',
            'issue_date',
            'due_date',
            'paid_date',
            'description',
            'linked_transaction_id',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'client_name', 'project_name')


    def get_total_projects(self, obj):
        return obj.projects.count()

    def _project_finance(self, obj):
        projects_qs = obj.projects.filter(created_by=obj.created_by)
        project_sums = projects_qs.aggregate(
            revenue=Sum('revenue'),
            labor=Sum('labor_cost'),
            overheads=Sum('direct_overheads'),
        )
        invoice_paid_sum = obj.invoices.filter(created_by=obj.created_by, status='paid').aggregate(total=Sum('amount'))['total']

        project_revenue = project_sums.get('revenue') or Decimal('0')
        total_revenue = invoice_paid_sum if invoice_paid_sum is not None else project_revenue
        total_cost = (project_sums.get('labor') or Decimal('0')) + (project_sums.get('overheads') or Decimal('0'))
        profit = total_revenue - total_cost
        margin_percent = (profit / total_revenue * Decimal('100')) if total_revenue else Decimal('0')
        return total_revenue, total_cost, profit, margin_percent

    def get_total_revenue_computed(self, obj):
        return self._project_finance(obj)[0]

    def get_total_cost(self, obj):
        return self._project_finance(obj)[1]

    def get_profit(self, obj):
        return self._project_finance(obj)[2]

    def get_margin_percent(self, obj):
        return round(float(self._project_finance(obj)[3]), 2)

    def validate(self, attrs):
        user = self.context['request'].user
        client = attrs.get('client') or getattr(self.instance, 'client', None)
        project = attrs.get('project') or getattr(self.instance, 'project', None)

        if client and client.created_by_id != user.id:
            raise serializers.ValidationError({'client': 'Не можна використовувати клієнта іншого користувача.'})
        if project and project.created_by_id != user.id:
            raise serializers.ValidationError({'project': 'Не можна використовувати проєкт іншого користувача.'})
        if client and project and project.client_id != client.id:
            raise serializers.ValidationError({'project': 'Проєкт має належати вибраному клієнту.'})

        return attrs


class TaxReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxReport
        fields = (
            'id',
            'year',
            'quarter',
            'income',
            'tax_ep',
            'esv_paid',
            'total_due',
            'paid_date',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = (
            'id',
            'name',
            'is_active',
            'conditions',
            'actions',
            'match_count',
            'last_match_date',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'match_count', 'last_match_date', 'created_at', 'updated_at')


class BankConnectionSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True, required=True, trim_whitespace=True)

    class Meta:
        model = BankConnection
        fields = (
            'id',
            'provider',
            'status',
            'token',
            'token_masked',
            'connected_at',
            'last_sync',
            'last_error',
            'disabled_reason',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'status',
            'token_masked',
            'connected_at',
            'last_sync',
            'last_error',
            'disabled_reason',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        from .crypto import encrypt_token, mask_token

        token = validated_data.pop('token').strip()
        if not token:
            raise serializers.ValidationError({'token': 'Token is required.'})

        validated_data['encrypted_token'] = encrypt_token(token)
        validated_data['token_masked'] = mask_token(token)
        validated_data['status'] = BankConnection.Status.CONNECTED
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from .crypto import encrypt_token, mask_token

        token = validated_data.pop('token', None)
        if token is not None:
            token = token.strip()
            if not token:
                raise serializers.ValidationError({'token': 'Token is required.'})
            instance.encrypted_token = encrypt_token(token)
            instance.token_masked = mask_token(token)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class RecurringExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringExpense
        fields = (
            'id',
            'name',
            'amount',
            'amount_type',
            'estimated_amount',
            'monthly_actual_amounts',
            'currency',
            'cycle',
            'category',
            'source',
            'allocation_type',
            'status',
            'next_payment_date',
            'last_paid_date',
            'description',
            'team',
            'project',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


    def get_total_projects(self, obj):
        return obj.projects.count()

    def _project_finance(self, obj):
        projects_qs = obj.projects.filter(created_by=obj.created_by)
        project_sums = projects_qs.aggregate(
            revenue=Sum('revenue'),
            labor=Sum('labor_cost'),
            overheads=Sum('direct_overheads'),
        )
        invoice_paid_sum = obj.invoices.filter(created_by=obj.created_by, status='paid').aggregate(total=Sum('amount'))['total']

        project_revenue = project_sums.get('revenue') or Decimal('0')
        total_revenue = invoice_paid_sum if invoice_paid_sum is not None else project_revenue
        total_cost = (project_sums.get('labor') or Decimal('0')) + (project_sums.get('overheads') or Decimal('0'))
        profit = total_revenue - total_cost
        margin_percent = (profit / total_revenue * Decimal('100')) if total_revenue else Decimal('0')
        return total_revenue, total_cost, profit, margin_percent

    def get_total_revenue_computed(self, obj):
        return self._project_finance(obj)[0]

    def get_total_cost(self, obj):
        return self._project_finance(obj)[1]

    def get_profit(self, obj):
        return self._project_finance(obj)[2]

    def get_margin_percent(self, obj):
        return round(float(self._project_finance(obj)[3]), 2)

    def validate(self, attrs):
        user = self.context['request'].user
        team = attrs.get('team') if 'team' in attrs else getattr(self.instance, 'team', None)
        project = attrs.get('project') if 'project' in attrs else getattr(self.instance, 'project', None)
        if team and team.created_by_id != user.id:
            raise serializers.ValidationError({'team': 'Не можна використовувати команду іншого користувача.'})
        if project and project.created_by_id != user.id:
            raise serializers.ValidationError({'project': 'Не можна використовувати проєкт іншого користувача.'})
        return attrs


class VariableExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariableExpense
        fields = (
            'id',
            'name',
            'amount',
            'currency',
            'category',
            'source',
            'status',
            'expense_date',
            'receipt_url',
            'external_tx_id',
            'description',
            'impact_flags',
            'allocation_type',
            'assignee',
            'team',
            'project',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'external_tx_id', 'created_at', 'updated_at')


    def get_total_projects(self, obj):
        return obj.projects.count()

    def _project_finance(self, obj):
        projects_qs = obj.projects.filter(created_by=obj.created_by)
        project_sums = projects_qs.aggregate(
            revenue=Sum('revenue'),
            labor=Sum('labor_cost'),
            overheads=Sum('direct_overheads'),
        )
        invoice_paid_sum = obj.invoices.filter(created_by=obj.created_by, status='paid').aggregate(total=Sum('amount'))['total']

        project_revenue = project_sums.get('revenue') or Decimal('0')
        total_revenue = invoice_paid_sum if invoice_paid_sum is not None else project_revenue
        total_cost = (project_sums.get('labor') or Decimal('0')) + (project_sums.get('overheads') or Decimal('0'))
        profit = total_revenue - total_cost
        margin_percent = (profit / total_revenue * Decimal('100')) if total_revenue else Decimal('0')
        return total_revenue, total_cost, profit, margin_percent

    def get_total_revenue_computed(self, obj):
        return self._project_finance(obj)[0]

    def get_total_cost(self, obj):
        return self._project_finance(obj)[1]

    def get_profit(self, obj):
        return self._project_finance(obj)[2]

    def get_margin_percent(self, obj):
        return round(float(self._project_finance(obj)[3]), 2)

    def validate(self, attrs):
        user = self.context['request'].user
        assignee = attrs.get('assignee') if 'assignee' in attrs else getattr(self.instance, 'assignee', None)
        team = attrs.get('team') if 'team' in attrs else getattr(self.instance, 'team', None)
        project = attrs.get('project') if 'project' in attrs else getattr(self.instance, 'project', None)
        if assignee and assignee.created_by_id != user.id:
            raise serializers.ValidationError({'assignee': 'Не можна використовувати девелопера іншого користувача.'})
        if team and team.created_by_id != user.id:
            raise serializers.ValidationError({'team': 'Не можна використовувати команду іншого користувача.'})
        if project and project.created_by_id != user.id:
            raise serializers.ValidationError({'project': 'Не можна використовувати проєкт іншого користувача.'})
        return attrs


class ManualCashBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualCashBalance
        fields = ('id', 'amount', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
