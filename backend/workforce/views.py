from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Team, Developer
from .serializers import TeamSerializer, DeveloperSerializer


class TeamViewSet(ModelViewSet):
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


class DeveloperViewSet(ModelViewSet):
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
