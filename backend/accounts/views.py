import os
import random

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    EmailOrUsernameTokenObtainPairSerializer,
    generate_unique_username,
    UserUpdateSerializer,
    RequestPasswordCodeSerializer,
    ConfirmPasswordChangeSerializer,
)

User = get_user_model()


def _password_code_cache_key(user_id: int) -> str:
    return f"password-change-code:{user_id}"


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
        except (OperationalError, ProgrammingError):
            return Response(
                {
                    'detail': (
                        'База даних не ініціалізована. '
                        'Виконай `python manage.py migrate` і повтори спробу.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailOrUsernameTokenObtainPairSerializer


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_token = request.data.get('id_token')
        if not raw_token:
            return Response({'detail': 'id_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        configured_client_ids = [
            item.strip()
            for item in os.getenv('GOOGLE_CLIENT_IDS', os.getenv('GOOGLE_CLIENT_ID', '')).split(',')
            if item.strip()
        ]
        if not configured_client_ids:
            return Response(
                {'detail': 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_IDS не налаштований на бекенді.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            payload = google_id_token.verify_oauth2_token(
                raw_token,
                google_requests.Request(),
                audience=None,
            )
        except ValueError as exc:
            return Response(
                {'detail': f'Невалідний Google токен: {str(exc)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_audience = (payload.get('aud') or '').strip()
        if token_audience not in configured_client_ids:
            return Response(
                {
                    'detail': (
                        'Google токен має неправильний client_id (aud). '
                        f'Отримано: {token_audience}'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (payload.get('email') or '').strip().lower()
        if not email or not payload.get('email_verified', False):
            return Response(
                {'detail': 'Google акаунт не має підтвердженого email.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()
        if not user:
            username = generate_unique_username(email.split('@')[0])
            user = User.objects.create_user(username=username, email=email)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RequestPasswordChangeCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RequestPasswordCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data['current_password']
        if not check_password(current_password, request.user.password):
            return Response({'detail': 'Неправильний поточний пароль.'}, status=status.HTTP_400_BAD_REQUEST)

        code = f"{random.randint(0, 9999):04d}"
        cache.set(_password_code_cache_key(request.user.id), code, timeout=10 * 60)

        send_mail(
            subject='Код для зміни паролю',
            message=f'Ваш код підтвердження: {code}. Код дійсний 10 хвилин.',
            from_email=os.getenv('DEFAULT_FROM_EMAIL', 'noreply@valdi.local'),
            recipient_list=[request.user.email],
            fail_silently=True,
        )

        return Response({'detail': 'Код підтвердження надіслано на вашу пошту.'})


class ConfirmPasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ConfirmPasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']
        cache_key = _password_code_cache_key(request.user.id)
        expected_code = cache.get(cache_key)

        if not expected_code:
            return Response({'detail': 'Код недійсний або протермінований.'}, status=status.HTTP_400_BAD_REQUEST)

        if code != expected_code:
            return Response({'detail': 'Неправильний код підтвердження.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        cache.delete(cache_key)

        return Response({'detail': 'Пароль успішно змінено.'})
