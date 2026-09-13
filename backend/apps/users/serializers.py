from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile, UserRole
from .taxonomy import SPECIALTY_TAG_SLUGS

User = get_user_model()


# Keys accepted inside UserProfile.preferences. Mirrored in
# frontend/src/api/account.js (PREFERENCE_KEYS). Whitelisted rather than open so
# the JSON column stays a settings store and not a dumping ground for whatever a
# client decides to send.
PREFERENCE_KEYS = {
    # General
    'language', 'timezone', 'date_format', 'theme',
    # Notifications
    'notify_email_digest', 'notify_in_app', 'notify_weekly_summary',
    'notify_reviewer_reminders',
    # Privacy
    'privacy_visibility', 'privacy_signed_reviews',
    # Reviewing — no columns of their own; the editor's assignment panel reads
    # these when it is built.
    'availability', 'unavailable_until', 'max_concurrent', 'credentials',
}


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.CharField(source='profile.role', read_only=True)
    status = serializers.CharField(source='profile.status', read_only=True)
    institution = serializers.CharField(
        source='profile.institution', required=False, allow_blank=True
    )
    expertise_areas = serializers.CharField(
        source='profile.expertise_areas', required=False, allow_blank=True
    )
    research_areas = serializers.CharField(
        source='profile.research_areas', required=False, allow_blank=True
    )
    availability_status = serializers.CharField(
        source='profile.availability_status', required=False, allow_blank=True, max_length=50
    )
    specialty_tags = serializers.ListField(
        source='profile.specialty_tags', child=serializers.CharField(), required=False,
    )

    # Self-editable profile fields. `name`/`email` deliberately are not: they are
    # the name of record on submissions, decision letters and certificates.
    # display_name is the nickname the UI renders in their place.
    display_name = serializers.CharField(
        source='profile.display_name', required=False, allow_blank=True, max_length=50
    )
    bio = serializers.CharField(
        source='profile.bio', required=False, allow_blank=True
    )
    website = serializers.URLField(
        source='profile.website', required=False, allow_blank=True
    )
    preferences = serializers.JSONField(source='profile.preferences', required=False)

    # Presence only — the image itself is served by GET /api/users/<pk>/avatar/,
    # which re-signs a URL on each request (presigned links expire in an hour).
    avatar_key = serializers.CharField(source='profile.avatar_key', read_only=True)

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
            'display_name',
            'role',
            'status',
            'institution',
            'bio',
            'website',
            'research_areas',
            'preferences',
            'avatar_key',
            'expertise_areas',
            'availability_status',
            'specialty_tags',
            'roles',
            'reviewer_status',
        )
        # The name of record — first_name, last_name and the `name` computed
        # from them — is not self-editable, because it is printed on
        # submissions, decision letters and certificates; letting someone change
        # it here would silently rewrite what is already on the published
        # record. display_name is the editable one. Correcting a legal name goes
        # through an editor, who has the admin endpoints for it.
        read_only_fields = (
            'id', 'email', 'first_name', 'last_name',
            'role', 'status', 'roles', 'reviewer_status', 'avatar_key',
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Preferences must be an object.')
        unknown = sorted(set(value) - PREFERENCE_KEYS)
        if unknown:
            raise serializers.ValidationError(
                f'Unknown preference key(s): {", ".join(unknown)}.'
            )
        return value

    def get_roles(self, obj):
        return list(obj.roles.filter(status=UserRole.Status.ACTIVE).values_list('role', flat=True))

    def get_reviewer_status(self, obj):
        reviewer_role = obj.roles.filter(role=UserProfile.Role.REVIEWER).first()
        return reviewer_role.status if reviewer_role else ''

    def validate_specialty_tags(self, value):
        unknown = sorted(set(value) - SPECIALTY_TAG_SLUGS)
        if unknown:
            raise serializers.ValidationError(f'Unknown specialty tag(s): {", ".join(unknown)}')
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        instance = super().update(instance, validated_data)
        if profile_data:
            # Reuse instance.profile (creating it if missing) rather than a
            # separate get_or_create() query, so the object we mutate is the
            # same one Django's reverse-o2o cache hands back on any later
            # instance.profile access in this request/response cycle —
            # otherwise a stale, pre-update profile can be re-serialized.
            try:
                profile = instance.profile
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=instance)

            # Preferences are one column holding many independent settings, so a
            # PATCH carrying only the changed keys must merge rather than
            # replace — otherwise saving a timezone would wipe every notification
            # choice, and two tabs saving different sections would clobber each
            # other.
            prefs = profile_data.pop('preferences', None)
            if prefs is not None:
                profile.preferences = {**(profile.preferences or {}), **prefs}
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return instance


class AdminUserListSerializer(serializers.ModelSerializer):
    """Flat user rows for the admin Users table."""
    name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    reviewer_status = serializers.SerializerMethodField()
    institution = serializers.CharField(source='profile.institution', default='', read_only=True)
    avatar_key = serializers.CharField(source='profile.avatar_key', default='', read_only=True)
    specialty_tags = serializers.ListField(
        source='profile.specialty_tags', child=serializers.CharField(), default=list, read_only=True,
    )
    orcid_id = serializers.CharField(source='profile.orcid_id', default='', read_only=True)
    website = serializers.CharField(source='profile.website', default='', read_only=True)
    expertise_areas = serializers.CharField(source='profile.expertise_areas', default='', read_only=True)
    research_areas = serializers.CharField(source='profile.research_areas', default='', read_only=True)
    degree = serializers.CharField(source='profile.degree', default='', read_only=True)
    professional_type = serializers.CharField(source='profile.professional_type', default='', read_only=True)
    status = serializers.SerializerMethodField()
    joined = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'name', 'email', 'roles', 'reviewer_status',
            'institution', 'avatar_key', 'specialty_tags', 'orcid_id', 'website',
            'expertise_areas', 'research_areas', 'degree', 'professional_type',
            'status', 'is_active', 'joined',
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    # Both read obj.roles.all(), never .filter(): .filter() discards the view's
    # prefetch_related('roles') cache and costs a query per row, which on the
    # full admin list meant ~2 round-trips x every user.
    def get_roles(self, obj):
        return [r.role for r in obj.roles.all() if r.status == UserRole.Status.ACTIVE]

    def get_reviewer_status(self, obj):
        for role in obj.roles.all():
            if role.role == UserProfile.Role.REVIEWER:
                return role.status
        return ''

    def get_status(self, obj):
        return 'active' if obj.is_active else 'deactivated'


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
    specialty_tags      = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    # ── Field validation ─────────────────────────────────────────────────────

    def validate_specialty_tags(self, value):
        unknown = sorted(set(value) - SPECIALTY_TAG_SLUGS)
        if unknown:
            raise serializers.ValidationError(f'Unknown specialty tag(s): {", ".join(unknown)}')
        return value

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
        specialty_tags      = validated_data.pop('specialty_tags', [])

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

        # Reuse user.profile rather than a separate update_or_create() query.
        # The post_save signal (signals.py) already created a blank profile
        # and cached it onto `user` the moment create_user() ran above — a
        # second, separately-fetched object here would update the DB row
        # correctly but leave that cached instance stale, so to_representation()
        # below (which reads back through user.profile) would report defaults
        # no matter what was actually saved.
        profile = user.profile
        profile.role = role
        profile.status = UserProfile.Status.ACTIVE
        profile.institution = institution
        profile.affiliation_type = affiliation_type
        profile.student_level = student_level
        profile.professional_type = professional_type
        profile.programme = programme
        profile.research_areas = research_areas
        profile.state = state
        profile.date_of_birth = date_of_birth
        profile.expertise_areas = expertise_areas
        profile.availability_status = availability_status
        profile.degree = degree
        profile.specialty_tags = specialty_tags
        profile.save()

        # Authors are active immediately. Reviewers — whether registering
        # directly or applying later via ApplyReviewerView — always land
        # PENDING until an admin reviews their background and approves.
        initial_status = (
            UserRole.Status.PENDING if role == UserProfile.Role.REVIEWER else UserRole.Status.ACTIVE
        )
        UserRole.objects.create(user=user, role=role, status=initial_status)

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

class ChangePasswordSerializer(serializers.Serializer):
    """Change your own password, proving you know the current one.

    Requiring the current password is what stops a borrowed unlocked laptop (or
    a stolen access token) from being turned into permanent account takeover.
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('That is not your current password.')
        return value

    def validate_new_password(self, value):
        # Django's configured validators (length, common-password list, numeric,
        # similarity to the user's own attributes). Passing the user is what
        # enables the similarity check.
        validate_password(value, self.context['request'].user)
        return value

    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError(
                {'new_password': 'The new password must be different from the current one.'}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user
