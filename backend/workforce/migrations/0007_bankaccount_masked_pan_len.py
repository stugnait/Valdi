from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0006_variableexpense_external_tx_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bankaccount',
            name='masked_pan',
            field=models.CharField(blank=True, max_length=128),
        ),
    ]
