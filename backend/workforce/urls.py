from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    TeamViewSet,
    DeveloperViewSet,
    ClientViewSet,
    ProjectViewSet,
    SubscriptionViewSet,
    BankConnectionViewSet,
    RecurringExpenseViewSet,
    VariableExpenseViewSet,
    AutomationRuleViewSet,
)

router = DefaultRouter()
router.register('teams', TeamViewSet, basename='team')
router.register('developers', DeveloperViewSet, basename='developer')
router.register('clients', ClientViewSet, basename='client')
router.register('projects', ProjectViewSet, basename='project')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('bank-connections', BankConnectionViewSet, basename='bank-connection')
router.register('recurring-expenses', RecurringExpenseViewSet, basename='recurring-expense')
router.register('variable-expenses', VariableExpenseViewSet, basename='variable-expense')
router.register('automation-rules', AutomationRuleViewSet, basename='automation-rule')

urlpatterns = [
    path('', include(router.urls)),
]
