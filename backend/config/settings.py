from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.postgres',
    'django.contrib.staticfiles',
    
    # Third Party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    
    # Local Apps
    'users.apps.UsersConfig',
    'projects',
    'edms',
    'communications',
    'finance',
    'scheduling',
    'banks.apps.BanksConfig',
    'masters.apps.MastersConfig',
    'procurement',
    'workflow',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # CORS first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.UserPresenceMiddleware',  # Track user activity
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

X_FRAME_OPTIONS = 'SAMEORIGIN' # Default
if DEBUG:
    X_FRAME_OPTIONS = 'ALLOWALL' # Allow iframes in dev

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# Use DATABASE_URL if available (production), otherwise use individual settings (development)
import dj_database_url

DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    # Production: Use DATABASE_URL from Neon/Render
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    # Development: Use individual database settings
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Production: Use WhiteNoise for static files
if not DEBUG:
    MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only in debug mode
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173').split(',')

# REST Framework Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Pagination (Feature Flag Controlled)
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination' if config('ENABLE_PAGINATION', default=True, cast=bool) else None,
    'PAGE_SIZE': config('API_PAGE_SIZE', default=50, cast=int),
    # Rate Limiting / Throttling (Feature Flag Controlled)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ] if config('ENABLE_RATE_LIMITING', default=True, cast=bool) else [],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_RATE_ANON', default='100/hour'),
        'user': config('THROTTLE_RATE_USER', default='1000/hour'),
        'login': '5/minute',  # Prevent brute force attacks
        'dashboard': '60/hour',  # Limit expensive dashboard queries
        'masterdata': '500/hour',  # Master data is cached, less restrictive
        'bulk': '10/hour',  # Bulk operations are expensive
    },
}

# ============================================================================
# CACHING CONFIGURATION
# ============================================================================
# Use Redis for caching in production, fallback to local memory in development
REDIS_URL = config('REDIS_URL', default=None)

if REDIS_URL:
    # Production: Redis cache
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            },
            'KEY_PREFIX': 'pmis',
            'TIMEOUT': 300,  # 5 minutes default
        }
    }
else:
    # Development: Local memory cache (no Redis required)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'pmis-dev-cache',
            'TIMEOUT': 300,
            'OPTIONS': {
                'MAX_ENTRIES': 1000,
            }
        }
    }

# Cache timeouts (in seconds)
CACHE_TTL_SHORT = 60 * 1  # 1 minute
CACHE_TTL_MEDIUM = 60 * 5  # 5 minutes
CACHE_TTL_LONG = 60 * 30  # 30 minutes

# ============================================================================
# FILE UPLOAD & DATA LIMITS
# ============================================================================
# Maximum size for uploaded files and form data
DATA_UPLOAD_MAX_MEMORY_SIZE = config('DATA_UPLOAD_MAX_MEMORY_SIZE', default=10485760, cast=int)  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = config('FILE_UPLOAD_MAX_MEMORY_SIZE', default=52428800, cast=int)  # 50MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000  # Prevent form field attacks

# File upload handlers
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

# Frontend URL (for invite links, etc.)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Email Configuration
# For development, use console backend (prints emails to console)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')

# AWS SES SMTP settings (for production)
# Set EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend' in .env for production
EMAIL_HOST = config('EMAIL_HOST', default='email-smtp.ap-south-1.amazonaws.com')  # Mumbai region
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('AWS_SES_SMTP_USER', default='')  # SES SMTP username
EMAIL_HOST_PASSWORD = config('AWS_SES_SMTP_PASSWORD', default='')  # SES SMTP password

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@pmis-zia.gov.in')

# Production Settings
# Cloudinary for media storage (Production only)
USE_CLOUDINARY = config('USE_CLOUDINARY', default=False, cast=bool)

if USE_CLOUDINARY:
    INSTALLED_APPS.insert(0, 'cloudinary_storage')
    INSTALLED_APPS.insert(0, 'cloudinary')
    
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': config('CLOUDINARY_API_KEY'),
        'API_SECRET': config('CLOUDINARY_API_SECRET'),
    }
    
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'


# ============================================================================
# SECURITY: AES-256 Message Encryption
# ============================================================================
# Encryption key for message content at rest (AES-256)
# CRITICAL: In production, use a secure 32+ character key from environment
# Generate a secure key: python -c "import secrets; print(secrets.token_urlsafe(32))"
MESSAGE_ENCRYPTION_KEY = config('MESSAGE_ENCRYPTION_KEY', default='pmis-dev-key-CHANGE-IN-PRODUCTION-2025')
