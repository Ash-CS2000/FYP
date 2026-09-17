"""
Removes the embedding/vector storage: reviewer matching now computes TF-IDF
similarities in memory per request (apps/matching/features.py), so nothing
needs to be stored. All dropped data was derived from manuscript, profile and
publication text, which is kept.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('matching', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            'DROP INDEX IF EXISTS reviewer_embedding_hnsw;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.DeleteModel(name='KeywordEmbedding'),
        migrations.DeleteModel(name='TagEmbedding'),
        migrations.DeleteModel(name='ManuscriptEmbedding'),
        migrations.DeleteModel(name='ReviewerEmbedding'),
        migrations.RemoveField(model_name='reviewerpublication', name='embedding'),
    ]
