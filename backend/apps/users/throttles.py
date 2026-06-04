from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """5 requests/minute for login & register."""
    scope = 'auth'


class OrcidRateThrottle(AnonRateThrottle):
    """10 requests/minute for ORCID endpoints."""
    scope = 'orcid'


class PasswordResetThrottle(AnonRateThrottle):
    """3 requests/hour for password reset."""
    scope = 'password_reset'