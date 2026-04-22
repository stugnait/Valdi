from django.db import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Team, Developer
from .serializers import TeamSerializer, DeveloperSerializer


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
