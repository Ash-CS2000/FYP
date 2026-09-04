from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_userprofile_degree_editorinvite'),
    ]

    operations = [
        # ── Repair 0006 ──────────────────────────────────────────────────────
        # 0006 recorded `degree` with SeparateDatabaseAndState(database_operations=[])
        # because the column had already been added out-of-band. That is correct
        # for the database it was written against, but it means a database built
        # fresh from migrations never gets the column at all — Django's state
        # says it exists while no SQL ever creates it, so the first query
        # touching `degree` fails on any clean deploy or test database.
        #
        # State already has the field, so this carries database_operations only.
        # IF NOT EXISTS makes it a no-op on the existing database and a repair on
        # a fresh one.
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="ALTER TABLE users_userprofile "
                        "ADD COLUMN IF NOT EXISTS degree varchar(100) NOT NULL DEFAULT '';",
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
        ),

        # ── Repair out-of-band `specialty_tags` ──────────────────────────────
        # The live database has a `specialty_tags jsonb NOT NULL` column with no
        # default that no migration ever created and that nothing in the
        # codebase references — another column added by hand. Because Django
        # does not know the field, every INSERT it builds omits the column, and
        # NOT NULL with no default then rejects the row: creating any
        # UserProfile fails, which takes registration down with it.
        #
        # Giving it a default makes the table insertable again without inventing
        # a model field for a column nothing reads. Guarded so it is a no-op on a
        # fresh database, where the column does not exist at all.
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'users_userprofile'
                              AND column_name = 'specialty_tags'
                              AND table_schema = current_schema()
                        ) THEN
                            EXECUTE 'ALTER TABLE users_userprofile '
                                 || 'ALTER COLUMN specialty_tags SET DEFAULT ''[]''::jsonb';
                            EXECUTE 'UPDATE users_userprofile '
                                 || 'SET specialty_tags = ''[]''::jsonb '
                                 || 'WHERE specialty_tags IS NULL';
                        END IF;
                    END $$;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
        ),

        # ── Account section fields ───────────────────────────────────────────
        migrations.AddField(
            model_name='userprofile',
            name='display_name',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bio',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='avatar_key',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='preferences',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
