from combat.routing import websocket_urlpatterns as combat_websocket_urlpatterns
from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns

websocket_urlpatterns = [
  *combat_websocket_urlpatterns,
  *chat_websocket_urlpatterns,
]
