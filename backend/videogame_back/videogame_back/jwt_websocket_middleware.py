"""Authenticate WebSockets using a JWT in the ``token`` query param."""

from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def _get_user(user_id: int):
  try:
    return User.objects.get(id=user_id)
  except User.DoesNotExist:
    return AnonymousUser()


class JWTQueryParamMiddleware:
  """Runs after ``AuthMiddleware`` so a valid JWT overrides the session user."""

  def __init__(self, inner):
    self.inner = inner

  async def __call__(self, scope, receive, send):
    if scope["type"] == "websocket":
      query_string = scope.get("query_string", b"").decode()
      params = parse_qs(query_string)
      token_list = params.get("token", [])
      if token_list:
        raw = token_list[0]
        try:
          validated = AccessToken(raw)
          uid = int(validated["user_id"])
          scope["user"] = await _get_user(uid)
        except (InvalidToken, TokenError, KeyError, TypeError, ValueError):
          pass
    return await self.inner(scope, receive, send)
