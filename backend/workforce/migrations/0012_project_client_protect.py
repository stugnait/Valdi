from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[('workforce','0011_backfill_client_status')]
    operations=[migrations.AlterField(model_name='project', name='client', field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='workforce.client'))]
