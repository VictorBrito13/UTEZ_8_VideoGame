"""
ASGI config for videogame_back project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

# Configure Django settings BEFORE importing Django modules
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")

from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

django_asgi_app = get_asgi_application()

from videogame_back.jwt_websocket_middleware import (  # noqa: E402
  JWTQueryParamMiddleware,
)
from videogame_back.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
  {
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
      JWTQueryParamMiddleware(URLRouter(websocket_urlpatterns)),
    ),
  },
)
