"""
The platform audit trail: a permanent record of privileged actions.

Append-only. A row can be created, and nothing else — editing or deleting one
raises, whether through the instance or a queryset. An audit trail that can be
rewritten holds nobody accountable, and admins are exactly the people it exists
to hold accountable, so there is also no API to write or change rows: entries
are only ever created by the server as a side effect of the action itself (see
services.record).
"""
from django.conf import settings
from django.db import models


class AuditLogImmutable(Exception):
    """Raised on any attempt to modify or delete an audit entry."""


class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise AuditLogImmutable('Audit entries cannot be modified.')

    def delete(self):
        raise AuditLogImmutable('Audit entries cannot be deleted.')


class AuditLog(models.Model):
    class Type(models.TextChoices):
        ROLE_CHANGE = 'role_change', 'Role change'
        ACCOUNT_STATUS = 'account_status', 'Account status'
        INVITATION = 'invitation', 'Invitation'
        SETTINGS_CHANGE = 'settings_change', 'Settings change'
        DECISION = 'decision', 'Decision'
        SCREENING = 'screening', 'Screening'
        ASSIGNMENT = 'assignment', 'Assignment'
        LOGIN_FAILURE = 'login_failure', 'Login failure'
        SECURITY = 'security', 'Security'

    type = models.CharField(max_length=32, choices=Type.choices, db_index=True)
    action = models.CharField(max_length=32)
    # One readable sentence, composed when the entry is written. Stored rather
    # than rendered later so the entry says what was true at the time.
    summary = models.CharField(max_length=500)

    # The FKs are for querying; the name/email snapshots are the record. Users
    # are soft-deleted in this app, but if one were ever removed the entry must
    # still say who acted.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    actor_name = models.CharField(max_length=255, blank=True)
    actor_email = models.EmailField(blank=True)
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    target_name = models.CharField(max_length=255, blank=True)
    target_email = models.EmailField(blank=True)

    role = models.CharField(max_length=20, blank=True)
    reason = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = AuditLogQuerySet.as_manager()

    class Meta:
        ordering = ['-created_at', '-id']

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AuditLogImmutable('Audit entries cannot be modified.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AuditLogImmutable('Audit entries cannot be deleted.')

    def __str__(self):
        return f'[{self.type}] {self.summary}'
