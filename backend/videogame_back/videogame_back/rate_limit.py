from __future__ import annotations

import time
from collections.abc import Callable
from functools import wraps
from typing import TypeVar

from django.core.cache import cache
from django.http import JsonResponse
from django.http.request import HttpRequest

T = TypeVar("T")


def check_rate_limit(key: str, limit: int, window_s: int) -> bool:
  """
  Fixed-window rate limiter using Django cache.

  Returns True if the action is allowed, False if it should be throttled.
  """

  if limit <= 0:
    return False
  if window_s <= 0:
    return True

  bucket = int(time.time() // window_s)
  cache_key = f"rl:{key}:{bucket}"
  timeout = window_s + 1

  try:
    cache.add(cache_key, 0, timeout=timeout)
    current = cache.incr(cache_key, 1)
  except ValueError:
    cache.set(cache_key, 1, timeout=timeout)
    current = 1

  return int(current) <= int(limit)


def _client_ip(request: HttpRequest) -> str:
  forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
  if forwarded:
    return forwarded.split(",")[0].strip()
  return request.META.get("REMOTE_ADDR", "unknown")


def rate_limited(
  name: str,
  *,
  limit: int,
  window_s: int,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
  def decorator(func: Callable[..., T]) -> Callable[..., T]:
    @wraps(func)
    def wrapper(request: HttpRequest, *args, **kwargs):  # type: ignore[no-untyped-def]
      user = getattr(request, "user", None)
      if user and getattr(user, "is_authenticated", False):
        identity = f"user:{user.id}"
      else:
        identity = f"ip:{_client_ip(request)}"

      key = f"http:{name}:{identity}"
      allowed = check_rate_limit(key, limit=limit, window_s=window_s)
      if not allowed:
        return JsonResponse(
          {"detail": "Rate limit exceeded"},
          status=429,
        )

      return func(request, *args, **kwargs)

    return wrapper

  return decorator
