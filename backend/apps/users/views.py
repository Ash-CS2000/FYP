from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import AuthRateThrottle


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
    throttle_classes = [AuthRateThrottle]  # 5/minute


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