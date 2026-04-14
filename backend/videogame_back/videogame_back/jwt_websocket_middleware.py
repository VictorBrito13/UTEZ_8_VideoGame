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
  """
  Middleware to authenticate WebSockets using a JWT in 'Authorization' header.
  Falling back to 'token' query param for backward compatibility if needed,
  but HEADER is the target for R1.2 and RNF-01 compliance.
  """

  def __init__(self, inner):
    self.inner = inner

  async def __call__(self, scope, receive, send):
    if scope["type"] == "websocket":
      headers = dict(scope.get("headers", []))
      auth_header = headers.get(b"authorization", b"").decode()

      raw_token = None
      if auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ")[1]
      else:
        # Fallback to query param (less secure, but keep it for now)
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        if token_list:
          raw_token = token_list[0]

      if raw_token:
        try:
          validated = AccessToken(raw_token)
          uid = int(validated["user_id"])
          scope["user"] = await _get_user(uid)
        except (InvalidToken, TokenError, KeyError, TypeError, ValueError):
          pass
    return await self.inner(scope, receive, send)
