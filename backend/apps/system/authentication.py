from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from .sessions import is_revoked

SESSION_ENDED = {
    'detail': 'Your session was ended by an administrator. Please sign in again.',
    'code': 'session_revoked',
}


class RevocableJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that also refuses tokens issued before "sign out everyone"."""

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_revoked(token):
            raise InvalidToken(SESSION_ENDED)
        return token


class RevocableTokenRefreshSerializer(TokenRefreshSerializer):
    """The renewal step applies the same rule, or a signed-out user could simply
    trade their old renewal token for a new, valid access token."""

    def validate(self, attrs):
        if is_revoked(self.token_class(attrs['refresh'])):
            raise InvalidToken(SESSION_ENDED)
        return super().validate(attrs)
