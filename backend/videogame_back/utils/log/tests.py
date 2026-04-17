from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.exceptions import APIException

from utils.log.api_exceptions import API_EXCEPTION_STATUS_LOG, api_exception_handler


class ApiExceptionHandlerTests(SimpleTestCase):
  def setUp(self):
    self.request = SimpleNamespace(
      method="POST",
      path="/api/test",
      user=SimpleNamespace(is_authenticated=True, pk=7),
    )

  def test_api_exception_logs_expected_levels(self):
    cases = (
      (500, "error"),
      (403, "warning"),
      (400, "info"),
    )

    for status, level in cases:
      with self.subTest(status=status):
        exc = APIException("boom")
        exc.status_code = status

        with patch(
          "utils.log.api_exceptions.drf_exception_handler",
          return_value=object(),
        ), patch("utils.log.api_exceptions.logger") as mock_logger:
          response = api_exception_handler(exc, {"request": self.request})

        self.assertIsNotNone(response)

        if level == "error":
          mock_logger.opt.assert_called_once_with(exception=exc)
          mock_logger.opt.return_value.error.assert_called_once_with(
            API_EXCEPTION_STATUS_LOG,
            "POST /api/test user_id=7",
            status,
          )
        elif level == "warning":
          mock_logger.warning.assert_called_once_with(
            API_EXCEPTION_STATUS_LOG,
            "POST /api/test user_id=7",
            status,
          )
        else:
          mock_logger.info.assert_called_once_with(
            API_EXCEPTION_STATUS_LOG,
            "POST /api/test user_id=7",
            status,
          )

  def test_generic_exception_logs_unhandled_when_response_missing(self):
    exc = RuntimeError("boom")

    with patch(
      "utils.log.api_exceptions.drf_exception_handler",
      return_value=None,
    ), patch("utils.log.api_exceptions.logger") as mock_logger:
      response = api_exception_handler(exc, {"request": None})

    self.assertIsNone(response)
    mock_logger.opt.assert_called_once_with(exception=exc)
    mock_logger.opt.return_value.error.assert_called_once_with(
      "Unhandled exception {}",
      "  user_id=None",
    )