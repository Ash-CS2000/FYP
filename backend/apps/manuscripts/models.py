from django.conf import settings
from django.db import models


class Manuscript(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        UNDER_REVIEW = 'under_review', 'Under Review'
        REVISIONS_REQUESTED = 'revisions_requested', 'Revisions Requested'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        PUBLISHED = 'published', 'Published'

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='manuscripts')

    # Step 1 — Type & details
    article_type = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=500)
    running_title = models.CharField(max_length=100, blank=True)
    abstract = models.TextField()
    category = models.CharField(max_length=255, blank=True)
    sub_category = models.CharField(max_length=255, blank=True)
    keywords = models.CharField(max_length=500, blank=True)

    # Step 3 — Manuscript file (Supabase Storage, not MEDIA_ROOT)
    file_key = models.CharField(max_length=1024)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    cover_letter = models.TextField(blank=True)

    # Step 4 — Declarations
    no_funding = models.BooleanField(default=False)
    funder = models.CharField(max_length=255, blank=True)
    grant_no = models.CharField(max_length=100, blank=True)
    no_competing = models.BooleanField(default=False)
    competing = models.TextField(blank=True)
    ethics_na = models.BooleanField(default=False)
    ethics = models.TextField(blank=True)
    data_statement = models.TextField(blank=True)

    # Step 5 — Agreement checkboxes (audit trail)
    agreed_original = models.BooleanField(default=False)
    agreed_not_under_review = models.BooleanField(default=False)
    agreed_all_approve = models.BooleanField(default=False)
    agreed_policies = models.BooleanField(default=False)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} ({self.owner.email})'


class ManuscriptAuthor(models.Model):
    manuscript = models.ForeignKey(Manuscript, on_delete=models.CASCADE, related_name='authors')
    order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=10, blank=True)
    given_name = models.CharField(max_length=150)
    family_name = models.CharField(max_length=150)
    degree = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    orcid = models.CharField(max_length=50, blank=True)
    corresponding = models.BooleanField(default=False)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.given_name} {self.family_name}'.strip()


class ManuscriptAffiliation(models.Model):
    author = models.ForeignKey(ManuscriptAuthor, on_delete=models.CASCADE, related_name='affiliations')
    department = models.CharField(max_length=255, blank=True)
    institution = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=150, blank=True)
    country = models.CharField(max_length=150, blank=True)


class ManuscriptSupplementaryFile(models.Model):
    manuscript = models.ForeignKey(Manuscript, on_delete=models.CASCADE, related_name='supplementary_files')
    file_key = models.CharField(max_length=1024)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
