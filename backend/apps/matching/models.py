"""
Reviewer publications for the reviewer matching system (see
apps/matching/ranking.py and ../../../matching_system.md).

Matching compares text with TF-IDF computed in memory on each request, so
there is no vector storage here -- only the publication text itself.
"""
from django.conf import settings
from django.db import models


class ReviewerPublication(models.Model):
    """A reviewer's past paper, used as a stronger expertise signal than a
    short profile blurb alone (see matching_system.md 'Reviewer text').
    Synthetic for seeded reviewers; real reviewers can add their own later
    (not yet exposed in the UI — see Open items)."""
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='publications')
    title = models.CharField(max_length=500)
    abstract = models.TextField(blank=True)
    year = models.PositiveSmallIntegerField()
    venue = models.CharField(max_length=255, blank=True)
    keywords = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-year']

    def __str__(self):
        return f'{self.title} ({self.year})'
