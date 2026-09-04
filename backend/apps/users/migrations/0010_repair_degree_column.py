from django.db import migrations


class Migration(migrations.Migration):
    """Create the `degree` column that migration 0006 only ever recorded in state.

    0006 added `degree` with SeparateDatabaseAndState(database_operations=[])
    because the column had already been created by hand on the shared database.
    That is correct for that database and wrong for every other one: Django's
    state says the field exists while no migration ever emits the SQL, so a
    database built from scratch — a fresh deploy, a test database, a new
    teammate's machine — has the field in the model and not in the table, and
    the first query touching it fails.

    State already carries the field, so this is database-only. IF NOT EXISTS
    makes it a no-op where the column is already present and a repair where it
    is not.

    (An earlier version of this migration also defaulted `specialty_tags`, which
    had the same problem. That is no longer needed: 0007_userprofile_specialty_tags
    makes it a real model field.)
    """

    dependencies = [
        ('users', '0009_userprofile_avatar_key_userprofile_bio_and_more'),
    ]

    operations = [
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
    ]
