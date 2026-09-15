from django.conf import settings
from django.db import models


class ScreeningSettings(models.Model):
    """
    Platform-wide similarity screening policy — a single row (pk=1).

    Admins set it; every screen that bands a similarity score reads it, so an
    editor, the author and the admin all see a score in the same band. Defaults
    mirror DEFAULT_SCREENING_SETTINGS in frontend/src/data/screeningSettings.js.
    """
    SINGLETON_PK = 1

    review_threshold = models.PositiveSmallIntegerField(default=15)
    high_threshold = models.PositiveSmallIntegerField(default=25)
    exclude_quotes = models.BooleanField(default=True)
    exclude_bibliography = models.BooleanField(default=True)
    min_words = models.PositiveSmallIntegerField(default=8)
    auto_flag = models.BooleanField(default=True)

    updated_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )

    EDITABLE_FIELDS = (
        'review_threshold', 'high_threshold', 'exclude_quotes',
        'exclude_bibliography', 'min_words', 'auto_flag',
    )

    class Meta:
        verbose_name_plural = 'screening settings'

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_PK
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=cls.SINGLETON_PK)
        return obj
