from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

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


class IsEditor(BasePermission):
    message = 'Editor access required.'

    def has_permission(self, request, view):
        return is_editor(request.user)


def deny_if_author(user, manuscript):
    """Call at the top of every editorial-action view that takes a
    manuscript: an editor (or admin) who is also an author of THIS
    manuscript must not screen it, decide on it, invite reviewers for it,
    see who is reviewing it, or publish it — see matching_system.md
    'Authorship protection'. Returns a 403 Response to short-circuit the
    view, or None if the check passes.

    Deliberately separate from is_editor_or_admin()/IsEditorOrAdmin (which
    only ask "does this user hold an editorial role at all") -- this is a
    per-manuscript check that must run in addition to those, not instead of
    them."""
    from .conflicts import is_author_of

    if is_author_of(manuscript, user):
        return Response(
            {'detail': 'You are an author on this manuscript and cannot take editorial actions on it.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None
