from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.CharField(source='profile.role', read_only=True)
    status = serializers.CharField(source='profile.status', read_only=True)
    institution = serializers.CharField(
        source='profile.institution', required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'role',
            'status',
            'institution',
        )
        read_only_fields = ('id', 'email', 'role', 'status')

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        instance = super().update(instance, validated_data)
        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    """
    Fields frontend sends:
      - full_name    (required)
      - email        (required)
      - password     (required, min 8 chars)
      - role         (required: author | reviewer)
      - institution  (optional)
    """
    full_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True, required=True, min_length=8, max_length=128
    )
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        default=UserProfile.Role.AUTHOR,
    )
    institution = serializers.CharField(required=False, allow_blank=True, max_length=255)

    # ── Field validation ─────────────────────────────────────────────────────

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please enter your full name.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_role(self, value):
        # Editor and Admin cannot self-register
        allowed = {
            UserProfile.Role.AUTHOR,
            UserProfile.Role.REVIEWER,
        }
        if value not in allowed:
            raise serializers.ValidationError('This role cannot self-register.')
        return value

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        role = validated_data.pop('role', UserProfile.Role.STUDENT)
        institution = validated_data.pop('institution', '')

        # Split full name into first + last
        name_parts = full_name.split(maxsplit=1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Create Django user
        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )

        # Create profile
        # Reviewers start as pending until admin approves
        status = (
            UserProfile.Status.PENDING
            if role == UserProfile.Role.REVIEWER
            else UserProfile.Status.ACTIVE
        )
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': role,
                'status': status,
                'institution': institution,
            },
        )
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Allows login with email instead of username.
    Returns: { access, refresh, user }
    """
    email = serializers.EmailField(write_only=True, required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        # Accept email field or username field
        login = attrs.get('email') or attrs.get(self.username_field, '')
        if not login:
            raise serializers.ValidationError({'email': 'Email is required.'})

        # Find user by email
        user = User.objects.filter(email__iexact=login.strip().lower()).first()
        attrs[self.username_field] = user.get_username() if user else login
        attrs.pop('email', None)

        data = super().validate(attrs)

        # Check if account is suspended
        profile = getattr(self.user, 'profile', None)
        if profile and profile.status == UserProfile.Status.REJECTED:
            raise serializers.ValidationError({'detail': 'Your account has been suspended.'})

        data['user'] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = getattr(user, 'profile', None)
        token['email'] = user.email
        token['role'] = profile.role if profile else ''
        token['status'] = profile.status if profile else ''
        return token