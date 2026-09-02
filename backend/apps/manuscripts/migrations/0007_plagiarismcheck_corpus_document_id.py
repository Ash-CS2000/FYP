from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manuscripts', '0006_decision'),
    ]

    operations = [
        migrations.AddField(
            model_name='plagiarismcheck',
            name='corpus_document_id',
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
