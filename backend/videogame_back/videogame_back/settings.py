import os
import importlib.util
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from utils.log import configure_logging

load_dotenv()
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

configure_logging(BASE_DIR)


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
  # Ephemeral local fallback to avoid hardcoded secrets in source code.
  SECRET_KEY = os.urandom(32).hex()

# Configure default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# When True, log one access line per request (method, path, status, duration).
ACCESS_LOG_ENABLED = (
  os.environ.get("DJANGO_ACCESS_LOG", "").lower() in ("1", "true", "yes")
  or DEBUG
)

# Local dev + Cloud Run service URL.
# Extend with DJANGO_ALLOWED_HOSTS=comma,separated
_extra_allowed = [
  h.strip()
  for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")
  if h.strip()
]
ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "workondapp.web.app",
  "backend-api-73278147951.northamerica-south1.run.app",
  *_extra_allowed,
]


# Application definition

INSTALLED_APPS = [
  "daphne",
  "django.contrib.admin",
  "django.contrib.auth",
  "django.contrib.contenttypes",
  "django.contrib.sessions",
  "django.contrib.messages",
  "django.contrib.staticfiles",
  "rest_framework",
  "rest_framework_simplejwt",
  "corsheaders",
  "channels",
  "chat",
  "combat",
  "creatures",
  "inventory",
  "user_profile",
  "ranking",
  "audit",
  "core",
]

MIDDLEWARE = [
  "django.middleware.security.SecurityMiddleware",
  "django.contrib.sessions.middleware.SessionMiddleware",
  "corsheaders.middleware.CorsMiddleware",
  "django.middleware.common.CommonMiddleware",
  "django.middleware.csrf.CsrfViewMiddleware",
  "django.contrib.auth.middleware.AuthenticationMiddleware",
  "django.contrib.messages.middleware.MessageMiddleware",
  "django.middleware.clickjacking.XFrameOptionsMiddleware",
  "core.middleware.AuditMiddleware",
  "utils.log.request_logging.RequestLoggingMiddleware",
]

ROOT_URLCONF = "videogame_back.urls"

TEMPLATES = [
  {
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {
      "context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
      ],
    },
  },
]

WSGI_APPLICATION = "videogame_back.wsgi.application"
ASGI_APPLICATION = "videogame_back.asgi.application"

CHANNEL_LAYERS = {
  "default": {
    "BACKEND": "channels.layers.InMemoryChannelLayer",
  },
}

ASGI_APPLICATION = "videogame_back.asgi.application"

CHANNEL_LAYERS = {
  "default": {
    "BACKEND": "channels.layers.InMemoryChannelLayer",
  }
}

CACHES = {
  "default": {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    "LOCATION": "videogame-backend",
  }
}


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# If we are in Cloud Run
if os.environ.get("INSTANCE_CONNECTION_NAME"):
  DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.mysql",
      "NAME": os.environ.get("DB_NAME"),
      "USER": os.environ.get("DB_USER"),
      "PASSWORD": os.environ.get("DB_PASS"),
      "HOST": f"/cloudsql/{os.environ.get('INSTANCE_CONNECTION_NAME')}",
    }
  }
else:
  # Local configuration (MySQL)
  DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.mysql",
      "NAME": os.environ.get("DB_NAME"),
      "USER": os.environ.get("DB_USER"),
      "PASSWORD": os.environ.get("DB_PASS"),
      "HOST": os.environ.get("DB_HOST"),
      "PORT": os.environ.get("DB_PORT"),
    }
  }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
  {
    "NAME": (
      "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    ),
  },
  {
    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
  },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/6.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework configurations
REST_FRAMEWORK = {
  "DEFAULT_AUTHENTICATION_CLASSES": (
    "rest_framework_simplejwt.authentication.JWTAuthentication",
  ),
  "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
  "EXCEPTION_HANDLER": "utils.log.api_exceptions.api_exception_handler",
}

# Simple JWT configurations

SIMPLE_JWT = {
  "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
  "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
  "ROTATE_REFRESH_TOKENS": True,
  "BLACKLIST_AFTER_ROTATION": True,
  "ALGORITHM": "HS256",
  "SIGNING_KEY": SECRET_KEY,
  "AUTH_HEADER_TYPES": ("Bearer",),
  "USER_ID_FIELD": "id",
  "USER_ID_CLAIM": "user_id",
}

# CORS Config for local frontend
CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "https://workondapp.web.app"]

# Logging: Loguru file sinks + stdlib bridge (see utils.log)
LOGGING = {
  "version": 1,
  "disable_existing_loggers": False,
  "handlers": {
    "loguru": {
      "class": "utils.log.interceptor.InterceptHandler",
    },
  },
  "root": {
    "handlers": ["loguru"],
    "level": "DEBUG",
  },
}

# Password hashing: prefer Argon2 when installed, fallback to PBKDF2.
PASSWORD_HASHERS = [
  "django.contrib.auth.hashers.PBKDF2PasswordHasher",
  "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

if importlib.util.find_spec("argon2") is not None:
  PASSWORD_HASHERS.insert(
    0, "django.contrib.auth.hashers.Argon2PasswordHasher"
  )
  
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
