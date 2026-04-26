from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0007_bankaccount_masked_pan_len'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(choices=[('USD', 'USD'), ('EUR', 'EUR'), ('UAH', 'UAH')], default='USD', max_length=3)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=16)),
                ('payment_date', models.DateField(blank=True, null=True)),
                ('due_date', models.DateField()),
                ('invoice_number', models.CharField(blank=True, max_length=64)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_payments', to=settings.AUTH_USER_MODEL)),
                ('subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='workforce.subscription')),
            ],
            options={
                'ordering': ('-due_date', '-created_at'),
            },
        ),
        migrations.AddIndex(
            model_name='subscriptionpayment',
            index=models.Index(fields=['created_by', 'subscription'], name='workforce_s_created_03489e_idx'),
        ),
        migrations.AddIndex(
            model_name='subscriptionpayment',
            index=models.Index(fields=['status'], name='workforce_s_status_3630dc_idx'),
        ),
    ]
