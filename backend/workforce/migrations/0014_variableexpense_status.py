from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0013_project_team_link'),
    ]

    operations = [
        migrations.AddField(
            model_name='variableexpense',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid')], default='pending', max_length=16),
        ),
    ]
