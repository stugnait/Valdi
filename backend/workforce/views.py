import json
import logging

from django.db import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Team, Developer, Client, Project, Subscription, BankConnection
from .serializers import (
    TeamSerializer,
    DeveloperSerializer,
    ClientSerializer,
    ProjectSerializer,
    SubscriptionSerializer,
    BankConnectionSerializer,
)

logger = logging.getLogger(__name__)
SENSITIVE_FIELDS = {'token', 'access_token', 'refresh_token', 'id_token', 'authorization'}


def _redact_sensitive(value):
    if isinstance(value, dict):
        return {
            key: ('***REDACTED***' if key.lower() in SENSITIVE_FIELDS else _redact_sensitive(item))
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_sensitive(item) for item in value]
    return value


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


class BankConnectionViewSet(SafeModelViewSet):
    serializer_class = BankConnectionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return BankConnection.objects.filter(created_by=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
