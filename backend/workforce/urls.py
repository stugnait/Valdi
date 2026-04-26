from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    TeamViewSet,
    DeveloperViewSet,
    ClientViewSet,
    ProjectViewSet,
    SubscriptionViewSet,
    SubscriptionPaymentViewSet,
    InvoiceViewSet,
    TaxReportViewSet,
    AutomationRuleViewSet,
    BankConnectionViewSet,
    RecurringExpenseViewSet,
    VariableExpenseViewSet,
    AnalyticsOverviewAPIView,
)

router = DefaultRouter()
router.register('teams', TeamViewSet, basename='team')
router.register('developers', DeveloperViewSet, basename='developer')
router.register('clients', ClientViewSet, basename='client')
router.register('projects', ProjectViewSet, basename='project')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('subscription-payments', SubscriptionPaymentViewSet, basename='subscription-payment')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('tax-reports', TaxReportViewSet, basename='tax-report')
router.register('automation-rules', AutomationRuleViewSet, basename='automation-rule')
router.register('bank-connections', BankConnectionViewSet, basename='bank-connection')
router.register('recurring-expenses', RecurringExpenseViewSet, basename='recurring-expense')
router.register('variable-expenses', VariableExpenseViewSet, basename='variable-expense')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/overview/', AnalyticsOverviewAPIView.as_view(), name='analytics-overview'),
]
