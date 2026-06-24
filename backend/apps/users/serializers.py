from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile, UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.CharField(source='profile.role', read_only=True)
    status = serializers.CharField(source='profile.status', read_only=True)
    institution = serializers.CharField(
        source='profile.institution', required=False, allow_blank=True
    )

    roles = serializers.SerializerMethodField()
    reviewer_status = serializers.SerializerMethodField()

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
            'roles',
            'reviewer_status',
        )
        read_only_fields = ('id', 'email', 'role', 'status', 'roles', 'reviewer_status')

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_roles(self, obj):
        return list(obj.roles.filter(status=UserRole.Status.ACTIVE).values_list('role', flat=True))

    def get_reviewer_status(self, obj):
        reviewer_role = obj.roles.filter(role=UserProfile.Role.REVIEWER).first()
        return reviewer_role.status if reviewer_role else ''

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
      - full_name         (required)
      - email             (required)
      - password          (required, min 8 chars)
      - role              (required: author | reviewer)
      - institution       (optional)
      - affiliation_type  (optional: student | professional)
      - student_level     (optional)
      - professional_type (optional)
      - programme         (optional)
      - research_areas    (optional)
      - state             (optional — Malaysian state)
      - date_of_birth     (optional — YYYY-MM-DD)
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
    institution       = serializers.CharField(required=False, allow_blank=True, max_length=255)
    affiliation_type  = serializers.CharField(required=False, allow_blank=True, max_length=20)
    student_level     = serializers.CharField(required=False, allow_blank=True, max_length=50)
    professional_type = serializers.CharField(required=False, allow_blank=True, max_length=50)
    programme         = serializers.CharField(required=False, allow_blank=True, max_length=255)
    research_areas      = serializers.CharField(required=False, allow_blank=True)
    state               = serializers.CharField(required=False, allow_blank=True, max_length=100)
    date_of_birth       = serializers.DateField(required=False, allow_null=True)
    expertise_areas     = serializers.CharField(required=False, allow_blank=True)
    availability_status = serializers.CharField(required=False, allow_blank=True, max_length=50)
    degree              = serializers.CharField(required=False, allow_blank=True, max_length=100)

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
        full_name         = validated_data.pop('full_name')
        password          = validated_data.pop('password')
        email             = validated_data.pop('email')
        role              = validated_data.pop('role', UserProfile.Role.AUTHOR)
        institution       = validated_data.pop('institution', '')
        affiliation_type  = validated_data.pop('affiliation_type', '')
        student_level     = validated_data.pop('student_level', '')
        professional_type = validated_data.pop('professional_type', '')
        programme         = validated_data.pop('programme', '')
        research_areas      = validated_data.pop('research_areas', '')
        state               = validated_data.pop('state', '')
        date_of_birth       = validated_data.pop('date_of_birth', None)
        expertise_areas     = validated_data.pop('expertise_areas', '')
        availability_status = validated_data.pop('availability_status', '')
        degree              = validated_data.pop('degree', '')

        name_parts = full_name.split(maxsplit=1)
        first_name = name_parts[0]
        last_name  = name_parts[1] if len(name_parts) > 1 else ''

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role':              role,
                'status':            UserProfile.Status.ACTIVE,
                'institution':       institution,
                'affiliation_type':  affiliation_type,
                'student_level':     student_level,
                'professional_type': professional_type,
                'programme':         programme,
                'research_areas':      research_areas,
                'state':               state,
                'date_of_birth':       date_of_birth,
                'expertise_areas':     expertise_areas,
                'availability_status': availability_status,
                'degree':              degree,
            },
        )

        role_status = (
            UserRole.Status.PENDING if role == UserProfile.Role.REVIEWER
            else UserRole.Status.ACTIVE
        )
        UserRole.objects.create(user=user, role=role, status=role_status)

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
        login = attrs.get('email') or attrs.get(self.username_field, '')
        if not login:
            raise serializers.ValidationError({'email': 'Email is required.'})

        user = User.objects.filter(email__iexact=login.strip().lower()).first()
        attrs[self.username_field] = user.get_username() if user else login
        attrs.pop('email', None)

        data = super().validate(attrs)

        profile = getattr(self.user, 'profile', None)
        if profile and profile.status == UserProfile.Status.REJECTED:
            raise serializers.ValidationError({'detail': 'Your account has been suspended.'})

        data['user'] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = getattr(user, 'profile', None)
        active_roles = list(
            user.roles.filter(status=UserRole.Status.ACTIVE).values_list('role', flat=True)
        )
        reviewer_role = user.roles.filter(role=UserProfile.Role.REVIEWER).first()

        token['email'] = user.email
        token['role'] = profile.role if profile else ''
        token['status'] = profile.status if profile else ''
        token['roles'] = active_roles
        token['reviewer_status'] = reviewer_role.status if reviewer_role else ''
        return token