from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0008_manualcashbalance'),
        ('workforce', '0008_subscriptionpayment'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringexpense',
            name='amount_type',
            field=models.CharField(choices=[('fixed', 'Fixed'), ('variable', 'Variable')], default='fixed', max_length=16),
        ),
        migrations.AddField(
            model_name='recurringexpense',
            name='estimated_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='recurringexpense',
            name='monthly_actual_amounts',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='variableexpense',
            name='impact_flags',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
