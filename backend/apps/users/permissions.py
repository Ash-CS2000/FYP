from rest_framework.permissions import BasePermission

from .models import UserProfile, UserRole


def is_admin(user):
    """True when the user holds an active admin role (or is a Django superuser).

    The multi-role system treats UserRole as the source of truth for access, so
    this checks there rather than UserProfile.role / is_staff.
    """
    if not (user and user.is_authenticated):
        return False
    if user.is_superuser:
        return True
    return user.roles.filter(
        role=UserProfile.Role.ADMIN, status=UserRole.Status.ACTIVE
    ).exists()


class IsAdmin(BasePermission):
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return is_admin(request.user)
