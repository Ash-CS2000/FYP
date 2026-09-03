from rest_framework.permissions import BasePermission

from apps.users.models import UserProfile, UserRole

EDITOR_LIKE_ROLES = (UserProfile.Role.EDITOR, UserProfile.Role.ADMIN)


def is_editor_or_admin(user):
    if not (user and user.is_authenticated):
        return False
    return user.roles.filter(role__in=EDITOR_LIKE_ROLES, status=UserRole.Status.ACTIVE).exists()


def is_editor(user):
    """Editor only, admin excluded. Screening is editorial judgement, not oversight."""
    if not (user and user.is_authenticated):
        return False
    return user.roles.filter(role=UserProfile.Role.EDITOR, status=UserRole.Status.ACTIVE).exists()


class IsEditorOrAdmin(BasePermission):
    message = 'You do not have permission to view all submissions.'

    def has_permission(self, request, view):
        return is_editor_or_admin(request.user)
