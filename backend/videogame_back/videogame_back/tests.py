import importlib
import os
from unittest.mock import AsyncMock, patch

from asgiref.sync import async_to_sync
from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase

import videogame_back.settings as settings_module
from videogame_back.jwt_auth_middleware import (
  JWTAuthMiddleware,
  jwt_auth_middleware_stack,
)


class SettingsModuleTests(SimpleTestCase):
  def test_secret_key_fallback_is_generated_when_env_is_missing(self):
    with patch.dict(os.environ, {"DJANGO_SECRET_KEY": ""}, clear=False), patch(
      "utils.log.configure_logging"
    ), patch.object(
      settings_module.os,
      "urandom",
      return_value=b"\x01" * 32,
    ):
      reloaded = importlib.reload(settings_module)

    self.assertEqual(reloaded.SECRET_KEY, "01" * 32)


class JWTAuthMiddlewareTests(SimpleTestCase):
  def test_stack_builder_wraps_inner_app(self):
    inner = AsyncMock()

    middleware = jwt_auth_middleware_stack(inner)

    self.assertIsInstance(middleware, JWTAuthMiddleware)

  def test_valid_token_populates_scope_user(self):
    inner = AsyncMock(return_value="ok")
    middleware = JWTAuthMiddleware(inner)
    scope = {"query_string": b"token=abc", "headers": []}
    user = object()

    with patch(
      "videogame_back.jwt_auth_middleware.UntypedToken"
    ) as mock_token, patch(
      "videogame_back.jwt_auth_middleware.jwt_decode",
      return_value={"user_id": 123},
    ), patch(
      "videogame_back.jwt_auth_middleware.get_user",
      new=AsyncMock(return_value=user),
    ):
      result = async_to_sync(middleware.__call__)(scope, AsyncMock(), AsyncMock())

    self.assertEqual(result, "ok")
    self.assertIs(scope["user"], user)
    mock_token.assert_called_once_with("abc")

  def test_missing_or_invalid_token_falls_back_to_anonymous_user(self):
    inner = AsyncMock(return_value="ok")
    middleware = JWTAuthMiddleware(inner)
    scope = {"query_string": b"", "headers": []}

    result = async_to_sync(middleware.__call__)(scope, AsyncMock(), AsyncMock())

    self.assertEqual(result, "ok")
    self.assertIsInstance(scope["user"], AnonymousUser)
