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
from .models import UserProfile, UserRole

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

        if response.status_code == 200:
            for throttle in self.get_throttles():
                if hasattr(throttle, 'on_success'):
                    throttle.on_success(request)

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { refresh }
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
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Reviewer application ──────────────────────────────────────────────────────

class ApplyReviewerView(APIView):
    """
    POST /api/users/apply-reviewer/
    Lets an authenticated author apply to also become a reviewer.
    Body (optional): { expertise_areas, qualifications }
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        existing_role = UserRole.objects.filter(user=request.user, role=UserProfile.Role.REVIEWER).first()
        if existing_role and existing_role.status == UserRole.Status.ACTIVE:
            return Response(
                {'detail': 'You already hold the reviewer role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if existing_role and existing_role.status == UserRole.Status.PENDING:
            return Response(
                {'detail': 'Your reviewer application is already pending review.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expertise = request.data.get('expertise_areas', '').strip()
        if expertise:
            profile.expertise_areas = expertise
            profile.save(update_fields=['expertise_areas'])

        UserRole.objects.update_or_create(
            user=request.user, role=UserProfile.Role.REVIEWER,
            defaults={'status': UserRole.Status.PENDING},
        )

        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class ReviewerApprovalView(APIView):
    """
    PATCH /api/users/<pk>/reviewer-status/
    Admin only. Body: { "action": "approve" | "reject" }
    """
    permission_classes = [permissions.IsAdminUser]
    throttle_classes = [UserRateThrottle]

    def patch(self, request, pk):
        action = request.data.get('action')
        if action not in ('approve', 'reject'):
            return Response(
                {'detail': 'action must be "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = (
            UserRole.Status.ACTIVE if action == 'approve' else UserRole.Status.REJECTED
        )
        UserRole.objects.update_or_create(
            user=user, role=UserProfile.Role.REVIEWER,
            defaults={'status': new_status},
        )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# ── ORCID ─────────────────────────────────────────────────────────────────────

class OrcidAuthUrlView(APIView):
    """
    GET /api/users/orcid/url/?role=author|reviewer
    Returns the ORCID authorization URL + a state token.
    The frontend must store `state` (e.g. sessionStorage) and send it
    back in the callback request.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        role = request.query_params.get('role', UserProfile.Role.AUTHOR)
        if role not in {UserProfile.Role.AUTHOR, UserProfile.Role.REVIEWER}:
            role = UserProfile.Role.AUTHOR

        state = orcid_service.generate_state()
        state_hash = orcid_service.hash_state(state)

        # Store the requested role alongside the state hash — 10 min, one-time use
        cache.set(f'orcid_state:{state_hash}', role, timeout=600)

        return Response({
            'auth_url': orcid_service.build_auth_url(state),
            'state': state,
        })


class OrcidCallbackView(APIView):
    """
    POST /api/users/orcid/callback/
    Body: { code, state }

    - If user is authenticated (Bearer token sent) → links ORCID iD and/or
      adds the requested role to their existing account.
    - If user is NOT authenticated → creates a new account using the
      ORCID record (or logs them in if that ORCID iD already exists),
      with the requested role.
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

        # Verify state (CSRF protection) — one-time use, also carries requested role
        state_hash = orcid_service.hash_state(state)
        requested_role = cache.get(f'orcid_state:{state_hash}')
        if not requested_role:
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

        # ── Case 1: Logged-in user linking ORCID / adding a role ────────────
        if request.user and request.user.is_authenticated:
            existing = User.objects.filter(profile__orcid_id=orcid_id).exclude(pk=request.user.pk).first()
            if existing:
                return Response(
                    {'detail': 'This ORCID iD is already linked to another account.'},
                    status=status.HTTP_409_CONFLICT
                )

            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            already_linked = bool(profile.orcid_id)

            if not profile.orcid_id:
                profile.orcid_id = orcid_id
                profile.save(update_fields=['orcid_id'])

            role_status = (
                UserRole.Status.PENDING if requested_role == UserProfile.Role.REVIEWER
                else UserRole.Status.ACTIVE
            )
            role_obj, role_created = UserRole.objects.get_or_create(
                user=request.user, role=requested_role,
                defaults={'status': role_status},
            )

            if already_linked and not role_created:
                return Response({
                    'detail': 'This ORCID iD is already registered with this role on your account.',
                    'already_registered': True,
                    'user': UserSerializer(request.user).data,
                })

            return Response({
                'detail': 'ORCID iD linked successfully.',
                'already_registered': False,
                'user': UserSerializer(request.user).data,
            })

        # ── Case 2: Not logged in — find existing-by-orcid/email, or create ─
        user, created = self._get_or_create_user(profile_data, requested_role)

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
    def _get_or_create_user(profile_data: dict, requested_role: str):
        orcid_id = profile_data['orcid_id']
        email = profile_data.get('email')
        role_status = (
            UserRole.Status.PENDING if requested_role == UserProfile.Role.REVIEWER
            else UserRole.Status.ACTIVE
        )

        # 1. Already linked to this ORCID iD → ensure they have the requested role too
        existing = User.objects.filter(profile__orcid_id=orcid_id).first()
        if existing:
            UserRole.objects.get_or_create(
                user=existing, role=requested_role, defaults={'status': role_status},
            )
            return existing, False

        # 2. Found by email → link ORCID + add requested role
        if email:
            existing = User.objects.filter(email__iexact=email).first()
            if existing:
                profile, _ = UserProfile.objects.get_or_create(user=existing)
                if not profile.orcid_id:
                    profile.orcid_id = orcid_id
                    profile.save(update_fields=['orcid_id'])
                UserRole.objects.get_or_create(
                    user=existing, role=requested_role, defaults={'status': role_status},
                )
                return existing, False

        # 3. Brand new account
        if not email:
            email = f"orcid_{orcid_id.replace('-', '')}@orcid.placeholder"

        user = User.objects.create_user(
            username=email, email=email,
            first_name=profile_data.get('first_name', ''),
            last_name=profile_data.get('last_name', ''),
        )
        UserProfile.objects.update_or_create(
            user=user,
            defaults={'role': requested_role, 'status': UserProfile.Status.ACTIVE, 'orcid_id': orcid_id},
        )
        UserRole.objects.create(user=user, role=requested_role, status=role_status)
        return user, True