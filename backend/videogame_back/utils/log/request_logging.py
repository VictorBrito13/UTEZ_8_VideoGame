"""Optional HTTP access logging (method, path, status, duration)."""

import time

from django.conf import settings

from utils.log import logger


class RequestLoggingMiddleware:
  """Log one INFO line per request when ACCESS_LOG_ENABLED is True."""

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    if not getattr(settings, "ACCESS_LOG_ENABLED", False):
      return self.get_response(request)

    start = time.perf_counter()
    response = self.get_response(request)
    duration_ms = (time.perf_counter() - start) * 1000
    user_id = None
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
      user_id = user.pk
    code = getattr(response, "status_code", 0)
    logger.info(
      "{} {} status={} duration_ms={:.1f} user_id={}",
      request.method,
      request.path,
      code,
      duration_ms,
      user_id,
    )
    return response
