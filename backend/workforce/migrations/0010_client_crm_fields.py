from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0009_recurring_variable_extensions'),
    ]

    operations = [
        migrations.RenameField(model_name='client', old_name='company', new_name='company_name'),
        migrations.RemoveField(model_name='client', name='is_active'),
        migrations.AddField(model_name='client', name='status', field=models.CharField(choices=[('lead', 'Lead'), ('active', 'Active'), ('paused', 'Paused'), ('completed', 'Completed'), ('archived', 'Archived')], default='lead', max_length=20)),
        migrations.AddField(model_name='client', name='website', field=models.URLField(blank=True)),
    ]
