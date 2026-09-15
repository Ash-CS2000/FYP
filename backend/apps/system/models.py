from django.conf import settings
from django.db import models


class PlatformState(models.Model):
    """Platform-wide operational state — a single row (pk=1)."""
    SINGLETON_PK = 1

    # Every login token issued before this moment is refused. See sessions.py.
    sessions_revoked_at = models.DateTimeField(null=True, blank=True)
    sessions_revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_PK
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=cls.SINGLETON_PK)
        return obj
