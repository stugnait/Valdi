from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


def generate_unique_username(base_username: str) -> str:
    username = base_username
    i = 1
    while User.objects.filter(username=username).exists():
        username = f'{base_username}{i}'
        i += 1
    return username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    agency_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'agency_name')
        read_only_fields = ('id',)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('Користувач з таким email вже існує.')
        return email

    def create(self, validated_data):
        validated_data.pop('agency_name', None)
        email = validated_data['email']
        username = generate_unique_username(validated_data.get('username') or email.split('@')[0])

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email_or_username = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        if not email_or_username or not password:
            raise serializers.ValidationError('Email та пароль обовʼязкові.')

        user = User.objects.filter(email__iexact=email_or_username).first()
        username = user.username if user else email_or_username

        authenticated_user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=password,
        )

        if not authenticated_user:
            raise serializers.ValidationError('Неправильний email/username або пароль.')

        refresh = self.get_token(authenticated_user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(authenticated_user).data,
        }
