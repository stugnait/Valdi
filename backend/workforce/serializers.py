from rest_framework import serializers

from .models import Team, Developer, TeamMembership


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
