import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-@d)&x@#3_$ujtb7=c7k@b+xd+k-yutc#488h+c^q8=v4d2i(#d',
)

DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Django's built-in /admin/ site edits the database directly: it skips every
# rule the API enforces and writes nothing to the audit log. Off unless a
# developer turns it on for local debugging.
DJANGO_ADMIN_ENABLED = os.getenv('DJANGO_ADMIN_ENABLED', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'apps.users',
    'apps.manuscripts',
    'apps.reviews',
    'apps.notifications',
    'apps.analysis',
    'apps.publications',
    'apps.discovery',
    'apps.audit',
    'apps.system',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'jsrems.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'jsrems.wsgi.application'

DB_SCHEMA = os.getenv('DB_SCHEMA', 'public')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'jsrems_db'),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'options': f'-c search_path={DB_SCHEMA}',
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        # `username` is dropped deliberately, and this costs nothing: accounts are
        # created with username set equal to email, so the email entry below
        # rejects exactly the same passwords. What it buys is a message people can
        # act on. The validator names whichever attribute it checked first, so
        # with `username` in the list every failure read "too similar to the
        # username" — a field nobody in this app has ever seen, since you register
        # and sign in with an email. It said that even when the real overlap was
        # with your surname.
        'OPTIONS': {'user_attributes': ('first_name', 'last_name', 'email')},
    },
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # JWTAuthentication, plus refusing tokens issued before an admin's
        # "sign out everyone" — see apps/system/sessions.py.
        'apps.system.authentication.RevocableJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',        # unknown users
        'user': '100/minute',       # logged in users
        'orcid': '10/minute',       # orcid login
        'admin_invite': '10/hour',  # sending an admin invite re-checks the sender's password
        'admin_invite_accept': '10/hour',  # accepting one may check the invitee's password
        'password_reset': '3/hour', # password reset
        'password_change': '10/hour',  # changing your own password. Looser than
                                    # password_reset: the caller is already
                                    # authenticated, and a legitimate user who
                                    # mistypes their current password twice must
                                    # not be locked out for an hour. Still
                                    # capped, because the endpoint takes the
                                    # current password and so can be guessed at.
        'discovery': '120/minute',  # public research library — browsing is cheap
                                    # and read-only, and the anon 30/min ceiling
                                    # is easy to hit just paging around /search
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_REFRESH_SERIALIZER': 'apps.system.authentication.RevocableTokenRefreshSerializer',
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://paperbridge-rose.vercel.app',
    'https://fyp-azp3.onrender.com',
]
CORS_ALLOW_CREDENTIALS = True

# Some Python builds (notably the python.org macOS installer) ship without a CA
# bundle, which makes SMTP-over-TLS fail with CERTIFICATE_VERIFY_FAILED. Point
# OpenSSL at certifi's bundle so outbound email (Gmail) can verify certs.
try:
    import certifi as _certifi

    os.environ.setdefault('SSL_CERT_FILE', _certifi.where())
    os.environ.setdefault('SSL_CERT_DIR', os.path.dirname(_certifi.where()))
except ImportError:
    pass

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

# Real SMTP once credentials are set; otherwise print emails to the server log
# so local dev works without a mailbox. Override explicitly with EMAIL_BACKEND.
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend'
    if EMAIL_HOST_USER
    else 'django.core.mail.backends.console.EmailBackend',
)
DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    f'PaperBridge <{EMAIL_HOST_USER}>' if EMAIL_HOST_USER else 'PaperBridge <noreply@paperbridge.local>',
)

# Base URL of the frontend — used to build links in emails (e.g. editor invites).
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')

JSREMS_MIN_REVIEWERS = 3
JSREMS_MAX_REVIEWERS = 5


ORCID_CLIENT_ID = os.getenv('ORCID_CLIENT_ID', '')
ORCID_CLIENT_SECRET = os.getenv('ORCID_CLIENT_SECRET', '')
ORCID_REDIRECT_URI = os.getenv('ORCID_REDIRECT_URI', '')
ORCID_BASE_URL = os.getenv('ORCID_BASE_URL', 'https://orcid.org')

# Contact address sent to OpenAlex on every Discover request. Identifying the
# caller puts us in their faster "polite pool"; it is not authentication and
# there is no key to keep secret. A deployment address, not a personal one.
OPENALEX_MAILTO = os.getenv('OPENALEX_MAILTO', '')

# Supabase Storage (S3-compatible) — used for manuscript file uploads
SUPABASE_S3_ENDPOINT_URL = os.getenv('SUPABASE_S3_ENDPOINT_URL', '')
SUPABASE_S3_REGION = os.getenv('SUPABASE_S3_REGION', 'ap-southeast-1')
SUPABASE_S3_BUCKET = os.getenv('SUPABASE_S3_BUCKET', '')
SUPABASE_S3_ACCESS_KEY_ID = os.getenv('SUPABASE_S3_ACCESS_KEY_ID', '')
SUPABASE_S3_SECRET_ACCESS_KEY = os.getenv('SUPABASE_S3_SECRET_ACCESS_KEY', '')

# noplage engine settings
NOPLAG_ENGINE_URL = os.environ.get("NOPLAG_ENGINE_URL", "https://noplag-engine.onrender.com")
NOPLAG_API_KEY = os.environ.get("NOPLAG_API_KEY", "")