import os

from django.contrib.auth import get_user_model
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
)

User = get_user_model()


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

        client_id = os.getenv('GOOGLE_CLIENT_ID')
        try:
            payload = google_id_token.verify_oauth2_token(
                raw_token,
                google_requests.Request(),
                audience=client_id or None,
            )
        except ValueError:
            return Response({'detail': 'Невалідний Google токен.'}, status=status.HTTP_400_BAD_REQUEST)

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
