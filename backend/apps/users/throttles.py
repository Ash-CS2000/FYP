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