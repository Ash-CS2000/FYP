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

    # ── Account section ──────────────────────────────────────────────────────
    # The name of record lives on auth_user (first_name/last_name) and appears on
    # submissions, decision letters and certificates, so it is not self-editable.
    # This is the display name the UI renders instead — a nickname, changeable at
    # will, with no bearing on the published record.
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.TextField(blank=True)

    # A Supabase Storage key, not an ImageField — the project has no MEDIA_ROOT
    # and Render's filesystem is ephemeral. Same convention as
    # ManuscriptSupplementaryFile.file_key. Read through GET /api/users/<pk>/avatar/.
    avatar_key = models.CharField(max_length=255, blank=True)

    # Language, timezone, notification and privacy choices — one blob rather than
    # a column per toggle, because they are read and written together and none of
    # them is ever queried across users. UserSerializer.validate_preferences
    # whitelists the keys so this cannot decay into a dumping ground.
    preferences = models.JSONField(default=dict, blank=True)

    def display_label(self):
        """What the UI shows: the nickname if set, else the name of record."""
        return self.display_name or self.user.get_full_name() or self.user.email

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


class EditorInvite(models.Model):
    """
    A pending editor onboarding. An admin creates one for someone not yet in the
    system; the invitee opens the link, sets a password, and the account is
    activated with the editor role. Single-use (accepted_at) and time-limited
    (expires_at).
    """
    email = models.EmailField()
    name = models.CharField(max_length=150, blank=True)
    token = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='editor_invites_sent',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        return self.accepted_at is None and self.expires_at > timezone.now()

    def __str__(self):
        state = 'accepted' if self.accepted_at else 'pending'
        return f'EditorInvite({self.email}, {state})'