from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    GoogleAuthView,
    MeView,
    RequestPasswordChangeCodeView,
    ConfirmPasswordChangeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('password/request-code/', RequestPasswordChangeCodeView.as_view(), name='password_request_code'),
    path('password/confirm/', ConfirmPasswordChangeView.as_view(), name='password_confirm'),
]
