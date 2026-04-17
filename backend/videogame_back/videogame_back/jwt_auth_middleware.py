import urllib.parse
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from django.contrib.auth import get_user_model


@database_sync_to_async
def get_user(user_id):
  User = get_user_model()
  try:
    return User.objects.get(id=user_id)
  except User.DoesNotExist:
    return AnonymousUser()


class JWTAuthMiddleware:
  def __init__(self, inner):
    self.inner = inner

  async def __call__(self, scope, receive, send):
    query_string = scope.get("query_string", b"").decode()
    query_params = urllib.parse.parse_qs(query_string)
    token = query_params.get("token", [None])[0]

    if not token:
      headers = dict(scope.get("headers", []))
      if b"authorization" in headers:
        auth_header = headers[b"authorization"].decode()
        if auth_header.startswith("Bearer "):
          token = auth_header.split(" ")[1]

    if token:
      try:
        UntypedToken(token)
        decoded_data = jwt_decode(
          token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        scope["user"] = await get_user(decoded_data["user_id"])
      except (InvalidToken, TokenError, Exception):
        scope["user"] = AnonymousUser()
    else:
      if "user" not in scope:
        scope["user"] = AnonymousUser()

    return await self.inner(scope, receive, send)


def jwt_auth_middleware_stack(inner):
  from channels.auth import AuthMiddlewareStack

  return JWTAuthMiddleware(AuthMiddlewareStack(inner))
