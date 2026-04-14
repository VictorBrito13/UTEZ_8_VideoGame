"""DRF exception handler: log API and database errors with Loguru."""

from django.db.utils import (
  DatabaseError,
  DataError,
  IntegrityError,
  OperationalError,
)
from loguru import logger
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


def _safe_request_info(request):
  if request is None:
    return {"method": "", "path": "", "user_id": None}
  user = getattr(request, "user", None)
  user_id = None
  if user is not None and getattr(user, "is_authenticated", False):
    user_id = getattr(user, "pk", None)
  return {
    "method": getattr(request, "method", ""),
    "path": getattr(request, "path", ""),
    "user_id": user_id,
  }


def api_exception_handler(exc, context):
  """
  Log request/response failures, with explicit branches for DB errors.
  Delegates response shaping to DRF's default handler.
  """
  response = drf_exception_handler(exc, context)
  request = context.get("request")
  info = _safe_request_info(request)
  msg_base = "{} {} user_id={}".format(
    info["method"],
    info["path"],
    info["user_id"],
  )

  if isinstance(exc, OperationalError):
    logger.opt(exception=exc).error("DB OperationalError {}", msg_base)
  elif isinstance(exc, IntegrityError):
    logger.opt(exception=exc).warning("DB IntegrityError {}", msg_base)
  elif isinstance(exc, DataError):
    logger.opt(exception=exc).error("DB DataError {}", msg_base)
  elif isinstance(exc, DatabaseError):
    logger.opt(exception=exc).error("DB DatabaseError {}", msg_base)
  elif isinstance(exc, APIException):
    status = exc.status_code
    log_msg = "APIException {} status={}"
    if status >= 500:
      logger.opt(exception=exc).error(log_msg, msg_base, status)
    elif status in (401, 403):
      logger.warning(log_msg, msg_base, status)
    else:
      logger.info(log_msg, msg_base, status)
  elif response is None:
    logger.opt(exception=exc).error("Unhandled exception {}", msg_base)

  return response
