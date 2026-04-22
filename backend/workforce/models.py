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
