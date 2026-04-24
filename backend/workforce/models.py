from django.conf import settings
from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teams',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'name'),
                name='uniq_team_name_per_owner',
            )
        ]

    def __str__(self):
        return self.name


class Developer(models.Model):
    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    role = models.CharField(max_length=120)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='developers',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('full_name',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'email'),
                name='uniq_developer_email_per_owner',
            )
        ]

    def __str__(self):
        return f'{self.full_name} <{self.email}>'


class TeamMembership(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    developer = models.ForeignKey(Developer, on_delete=models.CASCADE, related_name='memberships')
    allocation = models.PositiveSmallIntegerField(default=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('team', 'developer'),
                name='uniq_team_developer_membership',
            ),
            models.CheckConstraint(
                check=models.Q(allocation__gte=0) & models.Q(allocation__lte=100),
                name='allocation_between_0_100',
            ),
        ]

    def __str__(self):
        return f'{self.developer.full_name} -> {self.team.name} ({self.allocation}%)'


class Client(models.Model):
    name = models.CharField(max_length=150)
    company = models.CharField(max_length=180, blank=True)
    email = models.EmailField(blank=True)
    contact_person = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=64, blank=True)
    country = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'name'),
                name='uniq_client_name_per_owner',
            ),
        ]

    def __str__(self):
        return self.name


class Project(models.Model):
    class Status(models.TextChoices):
        LEAD = 'lead', 'Lead'
        ACTIVE = 'active', 'Active'
        FINISHED = 'finished', 'Finished'
        PAUSED = 'paused', 'Paused'

    class BillingModel(models.TextChoices):
        FIXED = 'fixed', 'Fixed'
        TIME_MATERIALS = 'time-materials', 'Time & Materials'

    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        EUR = 'EUR', 'EUR'
        UAH = 'UAH', 'UAH'

    class BillingCycle(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        BIWEEKLY = 'biweekly', 'Biweekly'
        MONTHLY = 'monthly', 'Monthly'

    name = models.CharField(max_length=180)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LEAD)
    start_date = models.DateField()
    end_date = models.DateField()
    billing_model = models.CharField(
        max_length=20,
        choices=BillingModel.choices,
        default=BillingModel.FIXED,
    )
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    total_contract_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    client_hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    monthly_cap = models.PositiveIntegerField(null=True, blank=True)
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        null=True,
        blank=True,
    )
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    direct_overheads = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    buffer_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_reserve_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'client', 'name'),
                name='uniq_project_name_per_client_owner',
            ),
        ]

    def __str__(self):
        return self.name


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PENDING = 'pending', 'Pending'
        PAUSED = 'paused', 'Paused'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        EUR = 'EUR', 'EUR'
        UAH = 'UAH', 'UAH'

    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        SEMI_ANNUAL = 'semi-annual', 'Semi-annual'
        YEARLY = 'yearly', 'Yearly'

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='subscriptions')
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name='subscriptions',
        null=True,
        blank=True,
    )
    plan_name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    start_date = models.DateField()
    next_billing_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    hours_included = models.PositiveIntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    confirmed_at = models.DateField(null=True, blank=True)
    confirmed_by = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'client', 'plan_name'),
                name='uniq_subscription_plan_per_client_owner',
            ),
        ]

    def __str__(self):
        return f'{self.client.name}: {self.plan_name}'


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SENT = 'sent', 'Sent'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        EUR = 'EUR', 'EUR'
        UAH = 'UAH', 'UAH'

    number = models.CharField(max_length=64)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    issue_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    linked_transaction_id = models.CharField(max_length=128, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-issue_date', '-created_at')
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'number'),
                name='uniq_invoice_number_per_owner',
            ),
        ]

    def __str__(self):
        return self.number


class TaxReport(models.Model):
    class Status(models.TextChoices):
        PAID = 'paid', 'Paid'
        PENDING = 'pending', 'Pending'
        OVERDUE = 'overdue', 'Overdue'

    year = models.PositiveIntegerField()
    quarter = models.PositiveSmallIntegerField()
    income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_ep = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esv_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tax_reports',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-year', '-quarter')
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'year', 'quarter'),
                name='uniq_tax_report_period_per_owner',
            ),
            models.CheckConstraint(
                check=models.Q(quarter__gte=1) & models.Q(quarter__lte=4),
                name='tax_report_quarter_between_1_4',
            ),
        ]

    def __str__(self):
        return f'Q{self.quarter} {self.year}'


class BankConnection(models.Model):
    class Provider(models.TextChoices):
        MONOBANK = 'monobank', 'Monobank'
        PRIVAT24 = 'privat24', 'Privat24'
        WISE = 'wise', 'Wise'
        REVOLUT = 'revolut', 'Revolut'

    class Status(models.TextChoices):
        CONNECTED = 'connected', 'Connected'
        ERROR = 'error', 'Error'
        SYNCING = 'syncing', 'Syncing'
        DISABLED = 'disabled', 'Disabled'

    provider = models.CharField(max_length=32, choices=Provider.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONNECTED)
    encrypted_token = models.TextField()
    token_masked = models.CharField(max_length=128)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    disabled_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bank_connections',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('created_by', 'provider'),
                name='uniq_bank_connection_provider_per_owner',
            ),
        ]

    def __str__(self):
        return f'{self.created_by_id}:{self.provider}'


class BankAccount(models.Model):
    class Provider(models.TextChoices):
        MONOBANK = 'monobank', 'Monobank'

    provider = models.CharField(max_length=32, choices=Provider.choices, default=Provider.MONOBANK)
    external_account_id = models.CharField(max_length=128)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bank_accounts',
    )
    iban = models.CharField(max_length=64, blank=True)
    masked_pan = models.CharField(max_length=32, blank=True)
    holder = models.CharField(max_length=150, blank=True)
    currency = models.CharField(max_length=3, default='UAH')
    timezone = models.CharField(max_length=64, default='UTC')
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sync_cursor = models.BigIntegerField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('provider', 'external_account_id', 'created_by'),
                name='uniq_bank_account_provider_external_owner',
            )
        ]

    def __str__(self):
        return f'{self.provider}:{self.external_account_id}'


class BankTransaction(models.Model):
    class Direction(models.TextChoices):
        DEBIT = 'debit', 'Debit'
        CREDIT = 'credit', 'Credit'

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    external_tx_id = models.CharField(max_length=128, unique=True)
    occurred_at = models.DateTimeField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=255, blank=True)
    mcc = models.PositiveIntegerField(null=True, blank=True)
    counterparty = models.CharField(max_length=255, blank=True)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    category = models.CharField(max_length=64, default='uncategorized')
    category_source = models.CharField(max_length=32, default='auto')
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-occurred_at',)
        indexes = [
            models.Index(fields=('bank_account', 'occurred_at')),
            models.Index(fields=('category',)),
        ]

    def __str__(self):
        return f'{self.external_tx_id} ({self.amount} {self.currency})'


class AutomationRule(models.Model):
    name = models.CharField(max_length=180)
    is_active = models.BooleanField(default=True)
    conditions = models.JSONField(default=list, blank=True)
    actions = models.JSONField(default=dict, blank=True)
    match_count = models.PositiveIntegerField(default=0)
    last_match_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='automation_rules',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)

    def __str__(self):
        return self.name


class RecurringExpense(models.Model):
    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        EUR = 'EUR', 'EUR'
        UAH = 'UAH', 'UAH'

    class Cycle(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        YEARLY = 'yearly', 'Yearly'

    class Source(models.TextChoices):
        MONOBANK = 'monobank', 'Monobank'
        PRIVAT24 = 'privat24', 'Privat24'
        CASH = 'cash', 'Cash'
        WISE = 'wise', 'Wise'
        PAYONEER = 'payoneer', 'Payoneer'

    class AllocationType(models.TextChoices):
        ALL = 'all', 'All'
        TEAM = 'team', 'Team'
        PROJECT = 'project', 'Project'
        NONE = 'none', 'None'

    class Status(models.TextChoices):
        PAID = 'paid', 'Paid'
        PENDING = 'pending', 'Pending'
        OVERDUE = 'overdue', 'Overdue'

    name = models.CharField(max_length=180)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    cycle = models.CharField(max_length=16, choices=Cycle.choices, default=Cycle.MONTHLY)
    category = models.CharField(max_length=64, default='other')
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.MONOBANK)
    allocation_type = models.CharField(max_length=16, choices=AllocationType.choices, default=AllocationType.ALL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    next_payment_date = models.DateField()
    last_paid_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring_expenses')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring_expenses')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recurring_expenses',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.name


class VariableExpense(models.Model):
    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        EUR = 'EUR', 'EUR'
        UAH = 'UAH', 'UAH'

    class Source(models.TextChoices):
        MONOBANK = 'monobank', 'Monobank'
        PRIVAT24 = 'privat24', 'Privat24'
        CASH = 'cash', 'Cash'
        WISE = 'wise', 'Wise'
        PAYONEER = 'payoneer', 'Payoneer'

    class AllocationType(models.TextChoices):
        ALL = 'all', 'All'
        TEAM = 'team', 'Team'
        PROJECT = 'project', 'Project'
        NONE = 'none', 'None'

    name = models.CharField(max_length=180)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    category = models.CharField(max_length=64, default='other')
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.MONOBANK)
    expense_date = models.DateField()
    receipt_url = models.CharField(max_length=300, blank=True)
    external_tx_id = models.CharField(max_length=128, blank=True, db_index=True)
    description = models.TextField(blank=True)
    allocation_type = models.CharField(max_length=16, choices=AllocationType.choices, default=AllocationType.ALL)
    assignee = models.ForeignKey(
        Developer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='variable_expenses',
    )
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='variable_expenses')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='variable_expenses')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='variable_expenses',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-expense_date', '-created_at')

    def __str__(self):
        return self.name
