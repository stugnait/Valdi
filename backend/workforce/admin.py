from django.contrib import admin

from .models import Team, Developer, TeamMembership


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
