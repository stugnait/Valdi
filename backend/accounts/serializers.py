from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


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
        username = validated_data.get('username') or email.split('@')[0]
        base_username = username
        i = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{i}'
            i += 1

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
