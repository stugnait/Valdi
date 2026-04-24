from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0005_invoice_taxreport'),
    ]

    operations = [
        migrations.AddField(
            model_name='variableexpense',
            name='external_tx_id',
            field=models.CharField(blank=True, db_index=True, max_length=128),
        ),
    ]
