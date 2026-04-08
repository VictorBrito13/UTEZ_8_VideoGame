"""Bridge stdlib logging to Loguru."""

import logging

from loguru import logger


class InterceptHandler(logging.Handler):
  """Forward records to Loguru, preserving exception tracebacks."""

  def emit(self, record: logging.LogRecord) -> None:
    try:
      level = logger.level(record.levelname).name
    except ValueError:
      level = str(record.levelno)

    frame, depth = logging.currentframe(), 2
    while frame is not None and frame.f_code.co_filename == logging.__file__:
      frame = frame.f_back
      depth += 1

    logger.opt(depth=depth, exception=record.exc_info).log(
      level,
      record.getMessage(),
    )
