from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0012_project_client_protect'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='team',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='projects', to='workforce.team'),
        ),
    ]
