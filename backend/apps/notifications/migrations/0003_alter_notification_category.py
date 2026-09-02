from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_alter_notification_category'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='category',
            field=models.CharField(
                choices=[
                    ('decision', 'Decision'),
                    ('revision_submitted', 'Revision Submitted'),
                    ('role', 'Role change'),
                ],
                default='decision',
                max_length=30,
            ),
        ),
    ]
