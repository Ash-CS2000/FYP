from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_availability_status_choices'),
        ('users', '0012_admininvite'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='userprofile',
            constraint=models.UniqueConstraint(
                fields=('orcid_id',),
                condition=~Q(orcid_id=''),
                name='unique_nonblank_userprofile_orcid_id',
            ),
        ),
    ]
