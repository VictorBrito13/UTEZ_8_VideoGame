from __future__ import annotations

import os
from functools import lru_cache

from .backend import MatchmakingBackend
from .in_memory_backend import InMemoryMatchmakingBackend


@lru_cache(maxsize=1)
def get_matchmaking_backend() -> MatchmakingBackend:
  backend_name = os.environ.get("MATCHMAKING_BACKEND", "memory").lower()
  if backend_name in ("memory", "in_memory", "inmem"):
    return InMemoryMatchmakingBackend()

  if backend_name in ("redis",):
    from .redis_backend import RedisMatchmakingBackend

    return RedisMatchmakingBackend()

  raise ValueError(f"Unknown MATCHMAKING_BACKEND: {backend_name}")
