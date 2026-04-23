from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    TeamViewSet,
    DeveloperViewSet,
    ClientViewSet,
    ProjectViewSet,
    SubscriptionViewSet,
    InvoiceViewSet,
    TaxReportViewSet,
    BankConnectionViewSet,
)

router = DefaultRouter()
router.register('teams', TeamViewSet, basename='team')
router.register('developers', DeveloperViewSet, basename='developer')
router.register('clients', ClientViewSet, basename='client')
router.register('projects', ProjectViewSet, basename='project')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('tax-reports', TaxReportViewSet, basename='tax-report')
router.register('bank-connections', BankConnectionViewSet, basename='bank-connection')

urlpatterns = [
    path('', include(router.urls)),
]
