from rest_framework import serializers

from .models import Team, Developer, TeamMembership, Client, Project, Subscription, BankConnection


class TeamMembershipSerializer(serializers.ModelSerializer):
    developer_name = serializers.CharField(source='developer.full_name', read_only=True)
    developer_email = serializers.CharField(source='developer.email', read_only=True)

    class Meta:
        model = TeamMembership
        fields = ('id', 'developer', 'developer_name', 'developer_email', 'allocation')


class TeamSerializer(serializers.ModelSerializer):
    memberships = TeamMembershipSerializer(many=True, required=False)

    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'created_at', 'updated_at', 'memberships')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        memberships_data = validated_data.pop('memberships', [])
        team = Team.objects.create(**validated_data)
        self._sync_memberships(team, memberships_data)
        return team

    def update(self, instance, validated_data):
        memberships_data = validated_data.pop('memberships', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if memberships_data is not None:
            self._sync_memberships(instance, memberships_data)

        return instance

    def _sync_memberships(self, team: Team, memberships_data):
        user = self.context['request'].user
        incoming = []
        for item in memberships_data:
            developer = item['developer']
            if developer.created_by_id != user.id:
                raise serializers.ValidationError('Не можна додавати девелопера іншого користувача.')

            membership, _ = TeamMembership.objects.update_or_create(
                team=team,
                developer=developer,
                defaults={'allocation': item.get('allocation', 100)},
            )
            incoming.append(membership.developer_id)

        if memberships_data is not None:
            team.memberships.exclude(developer_id__in=incoming).delete()


class DeveloperSerializer(serializers.ModelSerializer):
    teams = serializers.SerializerMethodField()

    class Meta:
        model = Developer
        fields = (
            'id',
            'full_name',
            'email',
            'role',
            'hourly_rate',
            'is_active',
            'created_at',
            'updated_at',
            'teams',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'teams')

    def get_teams(self, obj):
        return [
            {
                'id': membership.team_id,
                'name': membership.team.name,
                'allocation': membership.allocation,
            }
            for membership in obj.memberships.select_related('team').all()
        ]


class ClientSerializer(serializers.ModelSerializer):
    active_projects = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = (
            'id',
            'name',
            'company',
            'email',
            'contact_person',
            'phone',
            'country',
            'notes',
            'total_revenue',
            'is_active',
            'active_projects',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'active_projects')

    def get_active_projects(self, obj):
        return obj.projects.filter(status=Project.Status.ACTIVE).count()


class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'name',
            'client',
            'client_name',
            'status',
            'start_date',
            'end_date',
            'billing_model',
            'currency',
            'total_contract_value',
            'client_hourly_rate',
            'monthly_cap',
            'billing_cycle',
            'revenue',
            'labor_cost',
            'direct_overheads',
            'buffer_percent',
            'tax_reserve_percent',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'client_name')

    def validate_client(self, value):
        user = self.context['request'].user
        if value.created_by_id != user.id:
            raise serializers.ValidationError('Не можна використовувати клієнта іншого користувача.')
        return value


class SubscriptionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id',
            'client',
            'client_name',
            'project',
            'project_name',
            'plan_name',
            'description',
            'status',
            'amount',
            'currency',
            'billing_cycle',
            'start_date',
            'next_billing_date',
            'end_date',
            'hours_included',
            'features',
            'total_paid',
            'confirmed_at',
            'confirmed_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'client_name', 'project_name')

    def validate(self, attrs):
        user = self.context['request'].user
        client = attrs.get('client') or getattr(self.instance, 'client', None)
        project = attrs.get('project') if 'project' in attrs else getattr(self.instance, 'project', None)

        if client and client.created_by_id != user.id:
            raise serializers.ValidationError({'client': 'Не можна використовувати клієнта іншого користувача.'})

        if project:
            if project.created_by_id != user.id:
                raise serializers.ValidationError({'project': 'Не можна використовувати проєкт іншого користувача.'})
            if client and project.client_id != client.id:
                raise serializers.ValidationError({'project': 'Проєкт має належати вибраному клієнту.'})

        return attrs


class BankConnectionSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True, required=True, trim_whitespace=True)

    class Meta:
        model = BankConnection
        fields = (
            'id',
            'provider',
            'status',
            'token',
            'token_masked',
            'connected_at',
            'last_sync',
            'last_error',
            'disabled_reason',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'status',
            'token_masked',
            'connected_at',
            'last_sync',
            'last_error',
            'disabled_reason',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        from .crypto import encrypt_token, mask_token

        token = validated_data.pop('token').strip()
        if not token:
            raise serializers.ValidationError({'token': 'Token is required.'})

        validated_data['encrypted_token'] = encrypt_token(token)
        validated_data['token_masked'] = mask_token(token)
        validated_data['status'] = BankConnection.Status.CONNECTED
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from .crypto import encrypt_token, mask_token

        token = validated_data.pop('token', None)
        if token is not None:
            token = token.strip()
            if not token:
                raise serializers.ValidationError({'token': 'Token is required.'})
            instance.encrypted_token = encrypt_token(token)
            instance.token_masked = mask_token(token)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
