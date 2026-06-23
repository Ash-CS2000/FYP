from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        AUTHOR = 'author', 'Author'
        REVIEWER = 'reviewer', 'Reviewer'
        EDITOR = 'editor', 'Editor'
        ADMIN = 'admin', 'Admin'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PENDING = 'pending', 'Pending'
        REJECTED = 'rejected', 'Rejected'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    institution = models.CharField(max_length=255, blank=True)
    student_id = models.CharField(max_length=50, blank=True)
    programme = models.CharField(max_length=255, blank=True)
    orcid_id = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    research_areas = models.TextField(blank=True)
    expertise_areas = models.TextField(blank=True)
    availability_status = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f'{self.user.get_full_name() or self.user.email} ({self.role})'
