from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.cache import cache
from django.contrib.auth import get_user_model

from . import orcid_service
from .serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import AuthRateThrottle
from .models import UserProfile

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Body: { full_name, email, password, role, institution? }
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]  # 5/minute


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Body: { email, password }
    Returns: { access, refresh, user }
    """
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Reset progressive throttle count on successful login
        if response.status_code == 200:
            for throttle in self.get_throttles():
                if hasattr(throttle, 'on_success'):
                    throttle.on_success(request)

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { refresh }
    Blacklists the refresh token so it cannot be reused.
    Requires: Authorization: Bearer <access_token>
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'detail': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(APIView):
    """
    GET   /api/users/me/  → return own profile
    PATCH /api/users/me/  → update own profile
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]  # 100/minute

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── ORCID ─────────────────────────────────────────────────────────────────────

class OrcidAuthUrlView(APIView):
    """
    GET /api/users/orcid/url/
    Returns the ORCID authorization URL + a state token.
    The frontend must store `state` (e.g. sessionStorage) and send it
    back in the callback request.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        state = orcid_service.generate_state()
        state_hash = orcid_service.hash_state(state)

        # Store hash server-side for 10 minutes — one-time use, CSRF protection
        cache.set(f'orcid_state:{state_hash}', True, timeout=600)

        return Response({
            'auth_url': orcid_service.build_auth_url(state),
            'state': state,
        })


class OrcidCallbackView(APIView):
    """
    POST /api/users/orcid/callback/
    Body: { code, state }

    - If user is authenticated (Bearer token sent) → links ORCID iD to
      their existing profile.
    - If user is NOT authenticated → creates a new account using the
      ORCID record (or logs them in if that ORCID iD already exists).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        code = request.data.get('code')
        state = request.data.get('state')

        if not code or not state:
            return Response(
                {'detail': 'code and state are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify state (CSRF protection) — one-time use
        state_hash = orcid_service.hash_state(state)
        if not cache.get(f'orcid_state:{state_hash}'):
            return Response(
                {'detail': 'Invalid or expired state token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        cache.delete(f'orcid_state:{state_hash}')

        # Exchange code for token
        try:
            token_data = orcid_service.exchange_code_for_token(code)
        except Exception:
            return Response(
                {'detail': 'Failed to authenticate with ORCID. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        orcid_id = token_data.get('orcid')
        access_token = token_data.get('access_token')

        if not orcid_id or not access_token:
            return Response(
                {'detail': 'Incomplete response from ORCID.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch ORCID public record (name, email)
        try:
            profile_data = orcid_service.fetch_orcid_record(orcid_id, access_token)
        except Exception:
            profile_data = {
                'orcid_id': orcid_id,
                'email': token_data.get('email'),
                'first_name': token_data.get('name', '').split()[0] if token_data.get('name') else '',
                'last_name': ' '.join(token_data.get('name', '').split()[1:]) if token_data.get('name') else '',
            }

        # ── Case 1: Logged-in user linking ORCID to their existing profile ──
        if request.user and request.user.is_authenticated:
            existing = User.objects.filter(profile__orcid_id=orcid_id).exclude(pk=request.user.pk).first()
            if existing:
                return Response(
                    {'detail': 'This ORCID iD is already linked to another account.'},
                    status=status.HTTP_409_CONFLICT
                )

            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            profile.orcid_id = orcid_id
            profile.save(update_fields=['orcid_id'])

            return Response({
                'detail': 'ORCID iD linked successfully.',
                'user': UserSerializer(request.user).data,
            })

        # ── Case 2: Not logged in — find or create account ──────────────────
        user, created = self._get_or_create_user(profile_data)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @staticmethod
    def _get_or_create_user(profile_data: dict):
        orcid_id = profile_data['orcid_id']
        email = profile_data.get('email')

        # 1. Find by ORCID iD already linked
        existing = User.objects.filter(profile__orcid_id=orcid_id).first()
        if existing:
            return existing, False

        # 2. Find by email and link ORCID to that account
        if email:
            existing = User.objects.filter(email__iexact=email).first()
            if existing:
                profile, _ = UserProfile.objects.get_or_create(user=existing)
                profile.orcid_id = orcid_id
                profile.save(update_fields=['orcid_id'])
                return existing, False

        # 3. Create a brand new account (ORCID-only, no password)
        if not email:
            email = f"orcid_{orcid_id.replace('-', '')}@orcid.placeholder"

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=profile_data.get('first_name', ''),
            last_name=profile_data.get('last_name', ''),
        )
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': UserProfile.Role.AUTHOR,
                'status': UserProfile.Status.ACTIVE,
                'orcid_id': orcid_id,
            },
        )
        return user, True