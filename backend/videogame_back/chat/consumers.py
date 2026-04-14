import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from combat.models import Battle
from django.core.cache import cache

from .models import ChatMessage
from .utils import process_message


class ChatConsumer(AsyncWebsocketConsumer):
  async def connect(self):
    self.battle_id = None
    self.room_group_name = None
    self.battle = None
    self.user = self.scope.get("user")

    if not self.user or self.user.is_anonymous:
      await self.close(code=4401)
      return

    try:
      self.battle_id = int(self.scope["url_route"]["kwargs"]["battle_id"])
    except (KeyError, ValueError, TypeError):
      await self.close(code=4400)
      return

    self.room_group_name = f"battle_chat_{self.battle_id}"
    self.battle = await self._get_battle(self.battle_id)

    if not self.battle or not await self._is_player_in_battle():
      await self.close(code=4403)
      return

    await self.channel_layer.group_add(self.room_group_name, self.channel_name)
    await self.accept()
    await self._send_chat_history()

  async def disconnect(self, close_code):
    if self.room_group_name:
      await self.channel_layer.group_discard(
        self.room_group_name,
        self.channel_name,
      )

  async def receive(self, text_data):
    if not text_data:
      return

    try:
      payload = json.loads(text_data)
    except json.JSONDecodeError:
      await self.send(
        text_data=json.dumps(
          {"type": "error", "message": "Invalid JSON format"}
        )
      )
      return

    message = payload.get("message", "")
    if not isinstance(message, str) or not message.strip():
      return

    if not await self._check_rate_limit():
      await self.send(
        text_data=json.dumps(
          {
            "type": "rate_limited",
            "message": "Too many messages. Please wait a moment.",
          }
        )
      )
      return

    clean_message = process_message(message)
    message_id = await self._save_message(clean_message)

    await self.channel_layer.group_send(
      self.room_group_name,
      {
        "type": "chat_message",
        "id": message_id,
        "message": clean_message,
        "sender_id": self.user.id,
        "sender_username": self.user.username,
      },
    )

  async def chat_message(self, event):
    await self.send(
      text_data=json.dumps(
        {
          "type": "chat_message",
          "id": event.get("id"),
          "message": event.get("message"),
          "sender_id": event.get("sender_id"),
          "sender_username": event.get("sender_username"),
        }
      )
    )

  async def _send_chat_history(self):
    history = await self._get_chat_history()
    await self.send(
      text_data=json.dumps({"type": "chat_history", "messages": history})
    )

  async def _check_rate_limit(self) -> bool:
    if not self.user or self.user.is_anonymous:
      return False

    key = f"battle_chat_rate_{self.user.id}_{self.battle_id}"
    count = cache.get(key, 0)
    if count >= 5:
      return False

    cache.set(key, count + 1, 1)
    return True

  async def _is_player_in_battle(self) -> bool:
    if not self.battle or not self.user:
      return False
    return (
      self.battle.player1_id == self.user.id
      or self.battle.player2_id == self.user.id
    )

  @database_sync_to_async
  def _get_battle(self, battle_id):
    try:
      return Battle.objects.get(id=battle_id)
    except Battle.DoesNotExist:
      return None

  @database_sync_to_async
  def _get_chat_history(self):
    if not self.battle:
      return []

    rows = list(
      ChatMessage.objects.filter(battle=self.battle)
      .order_by("created_at")
      .values("id", "sender_id", "sender__username", "message")
    )

    return [
      {
        "id": row["id"],
        "sender_id": row["sender_id"],
        "sender_username": row["sender__username"],
        "message": row["message"],
      }
      for row in rows
    ]

  @database_sync_to_async
  def _save_message(self, message_text):
    if not self.battle or not self.user:
      return None

    message = ChatMessage.objects.create(
      battle=self.battle,
      sender=self.user,
      message=message_text,
    )
    return message.id
