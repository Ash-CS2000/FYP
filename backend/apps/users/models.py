from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        AUTHOR = 'author', 'Author'
        REVIEWER = 'reviewer', 'Reviewer'
        EDITOR = 'editor', 'Editor'
        ADMIN = 'admin', 'Admin'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PENDING = 'pending', 'Pending'
        REJECTED = 'rejected', 'Rejected'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AUTHOR)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    institution = models.CharField(max_length=255, blank=True)
    student_id = models.CharField(max_length=50, blank=True)
    programme = models.CharField(max_length=255, blank=True)
    orcid_id = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    research_areas = models.TextField(blank=True)
    expertise_areas = models.TextField(blank=True)
    availability_status = models.CharField(max_length=50, blank=True)

    # Registration-form fields (added by teammate, restored here)
    affiliation_type = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    professional_type = models.CharField(max_length=50, blank=True)
    state = models.CharField(max_length=100, blank=True)
    student_level = models.CharField(max_length=50, blank=True)
    degree = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.user.get_full_name() or self.user.email} ({self.role})'


class UserRole(models.Model):
    """
    A user can hold multiple roles (e.g. author + reviewer) simultaneously.
    UserProfile.role remains the user's primary/default role for registration
    and initial routing; this table is the source of truth for access control.
    """
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PENDING = 'pending', 'Pending'
        REJECTED = 'rejected', 'Rejected'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roles')
    role = models.CharField(max_length=20, choices=UserProfile.Role.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role')

    def __str__(self):
        return f'{self.user.email} — {self.role} ({self.status})'