# apps/users/throttles.py
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from .progressive_throttle import ProgressiveAuthThrottle


class AuthRateThrottle(ProgressiveAuthThrottle):
    """Progressive throttle for login & register."""
    pass


class OrcidRateThrottle(AnonRateThrottle):
    scope = 'orcid'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


class PasswordChangeThrottle(UserRateThrottle):
    """Throttle for changing your own password.

    Keyed by user, not IP. PasswordResetThrottle cannot be reused here:
    AnonRateThrottle returns no cache key for an authenticated request, so it
    would never fire on an endpoint that requires a login. Rate-limiting still
    matters because the endpoint takes the current password and so is an online
    guessing oracle — but on its own scope, since the anonymous reset flow's
    3/hour would lock out a legitimate user who mistyped twice.
    """
    scope = 'password_change'