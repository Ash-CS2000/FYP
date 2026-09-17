from django.db import migrations, models

VALID = {'available', 'busy', 'unavailable'}


def backfill_availability(apps, schema_editor):
    """Normalise availability_status to one of the three real choices.

    - preferences->>'availability' holds a valid value and the column does
      not -- the Profile page used to write availability into that JSON key
      by mistake instead of this column, so it is carried over.
    - legacy 'on_leave' (older registration/seed data) -> 'unavailable': a
      reviewer on leave must not become invitable.
    - blank or any other stray value -> 'available', the field's new default.
      Previously a blank value silently meant "cannot be invited", which is
      wrong for an account that never touched this setting.

    Note: on the live database this migration had already run with
    'on_leave' -> 'available' before that mapping was corrected; those rows
    cannot be told apart afterwards.
    """
    UserProfile = apps.get_model('users', 'UserProfile')
    for profile in UserProfile.objects.all().iterator():
        current = profile.availability_status
        prefs_value = (profile.preferences or {}).get('availability')
        if current not in VALID and prefs_value in VALID:
            profile.availability_status = prefs_value
            profile.save(update_fields=['availability_status'])
        elif current not in VALID:
            profile.availability_status = 'unavailable' if current == 'on_leave' else 'available'
            profile.save(update_fields=['availability_status'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_repair_degree_column'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='availability_status',
            field=models.CharField(
                blank=True,
                choices=[('available', 'Available'), ('busy', 'Heavy load'), ('unavailable', 'Unavailable')],
                default='available',
                max_length=50,
            ),
        ),
        migrations.RunPython(backfill_availability, noop_reverse),
    ]
