"""Loguru sinks and configuration for the Django project."""

from __future__ import annotations

import sys
from pathlib import Path

from loguru import logger

LOG_FORMAT = (
  "{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name} {function}:{line} | "
  "{message}"
)

_LEVEL_NAMES = ("INFO", "WARNING", "ERROR", "CRITICAL")

_RETENTION = "10 days"
_ROTATION = "00:00"
_COMPRESSION = "zip"


def _exact_level_filter(level_name: str):
  def _filter(record) -> bool:
    return record["level"].name == level_name

  return _filter


def configure_logging(base_dir: Path) -> None:
  """Configure Loguru: per-level dated files under ``base_dir / logs``."""
  logs_dir = base_dir / "logs"
  logs_dir.mkdir(parents=True, exist_ok=True)

  logger.remove()

  for level_name in _LEVEL_NAMES:
    path = logs_dir / f"{{time:YYYY-MM-DD}}-{level_name}.log"
    backtrace = level_name in ("ERROR", "CRITICAL")
    diagnose = level_name in ("ERROR", "CRITICAL")
    logger.add(
      str(path),
      format=LOG_FORMAT,
      level="DEBUG",
      filter=_exact_level_filter(level_name),
      rotation=_ROTATION,
      retention=_RETENTION,
      compression=_COMPRESSION,
      enqueue=True,
      backtrace=backtrace,
      diagnose=diagnose,
    )

  logger.add(
    sys.stderr,
    format=LOG_FORMAT,
    level="DEBUG",
    enqueue=True,
    backtrace=True,
    diagnose=True,
  )
