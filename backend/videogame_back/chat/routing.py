from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
  # URL pattern for combat chat with battle_id
  re_path(
    r"ws/chat/combat/(?P<battle_id>\d+)$", consumers.ChatConsumer.as_asgi()
  ),
]
