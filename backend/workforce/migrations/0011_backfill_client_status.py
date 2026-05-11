from django.db import migrations


def backfill_client_status(apps, schema_editor):
    Client = apps.get_model('workforce', 'Client')
    Client.objects.filter(status__isnull=True).update(status='lead')
    Client.objects.filter(status='').update(status='lead')


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0010_client_crm_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_client_status, migrations.RunPython.noop),
    ]
