from django.contrib import admin

from .models import (
    Team,
    Developer,
    TeamMembership,
    Client,
    Project,
    Subscription,
    BankConnection,
    BankAccount,
    BankTransaction,
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'updated_at')
    search_fields = ('name',)


@admin.register(Developer)
class DeveloperAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'role', 'hourly_rate', 'is_active', 'created_by')
    list_filter = ('is_active',)
    search_fields = ('full_name', 'email', 'role')


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ('team', 'developer', 'allocation')
    search_fields = ('team__name', 'developer__full_name', 'developer__email')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'email', 'country', 'is_active', 'created_by')
    list_filter = ('is_active', 'country')
    search_fields = ('name', 'company', 'email', 'contact_person')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'status', 'billing_model', 'currency', 'created_by')
    list_filter = ('status', 'billing_model', 'currency')
    search_fields = ('name', 'client__name')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('plan_name', 'client', 'status', 'amount', 'currency', 'next_billing_date', 'created_by')
    list_filter = ('status', 'currency', 'billing_cycle')
    search_fields = ('plan_name', 'client__name', 'project__name')


@admin.register(BankConnection)
class BankConnectionAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'status', 'last_sync_at', 'updated_at')
    list_filter = ('provider', 'status')
    search_fields = ('user__email', 'external_client_id')


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('connection', 'external_account_id', 'currency', 'type', 'is_tracked', 'current_balance')
    list_filter = ('currency', 'type', 'is_tracked')
    search_fields = ('external_account_id', 'iban_masked_pan', 'connection__user__email')


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ('account', 'external_tx_id', 'amount', 'currency', 'direction', 'occurred_at')
    list_filter = ('currency', 'direction')
    search_fields = ('external_tx_id', 'mcc', 'description', 'account__external_account_id')
