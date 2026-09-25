from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0004_reviewassignment_authorship_conflict_at_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReviewAssessment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quality', models.PositiveSmallIntegerField()),
                ('accuracy', models.PositiveSmallIntegerField()),
                ('errors', models.PositiveSmallIntegerField(default=0)),
                ('note', models.TextField(blank=True)),
                ('assessed_at', models.DateTimeField(auto_now=True)),
                ('assessed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='review_assessments_made', to=settings.AUTH_USER_MODEL)),
                ('review', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='assessment', to='reviews.review')),
            ],
            options={
                'ordering': ['-assessed_at'],
            },
        ),
    ]
