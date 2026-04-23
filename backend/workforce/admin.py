from django.contrib import admin

from .models import (
    Team,
    Developer,
    TeamMembership,
    Client,
    Project,
    Subscription,
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


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('provider', 'external_account_id', 'currency', 'balance', 'created_by', 'last_synced_at')
    list_filter = ('provider', 'currency')
    search_fields = ('external_account_id', 'iban', 'holder')


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ('external_tx_id', 'bank_account', 'occurred_at', 'amount', 'currency', 'category')
    list_filter = ('currency', 'category', 'direction')
    search_fields = ('external_tx_id', 'description', 'counterparty')
