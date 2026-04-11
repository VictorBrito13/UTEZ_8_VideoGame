from django.urls import re_path

from .consumers import MatchmakingConsumer
from .battle_consumer import BattleConsumer

websocket_urlpatterns = [
  re_path(r"^ws/matchmaking$", MatchmakingConsumer.as_asgi()),
  re_path(r"^ws/battle/(?P<battle_id>\d+)$", BattleConsumer.as_asgi()),
]
