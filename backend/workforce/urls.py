from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    TeamViewSet,
    DeveloperViewSet,
    ClientViewSet,
    ProjectViewSet,
    SubscriptionViewSet,
    IntegrationViewSet,
)

router = DefaultRouter()
router.register('teams', TeamViewSet, basename='team')
router.register('developers', DeveloperViewSet, basename='developer')
router.register('clients', ClientViewSet, basename='client')
router.register('projects', ProjectViewSet, basename='project')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('integrations', IntegrationViewSet, basename='integration')

urlpatterns = [
    path('', include(router.urls)),
]
