import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import ChatMessage
from combat.models import Battle
from .utils import process_message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.battle_id = self.scope['url_route']['kwargs']['battle_id']
        self.room_group_name = f"battle_chat_{self.battle_id}"

        # Join the battle room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave the battle room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message', '')
        user_id = data.get('user_id') # In production, use scope['user']

        if not message:
            return

        # 1. Process message (Sanitization & Filter)
        clean_message = process_message(message)

        # 2. Save message to Database (Async)
        await self.save_message(user_id, clean_message)

        # 3. Send message to the battle room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': clean_message,
                'user_id': user_id,
            }
        )

    # Receive message from the battle room group
    async def chat_message(self, event):
        message = event['message']
        user_id = event['user_id']

        # Send message back to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'user_id': user_id,
        }))

    @database_sync_to_async
    def save_message(self, user_id, message_text):
        try:
            battle = Battle.objects.get(id=self.battle_id)
            user = User.objects.get(id=user_id)
            ChatMessage.objects.create(
                battle=battle,
                sender=user,
                message=message_text
            )
        except (Battle.DoesNotExist, User.DoesNotExist):
            # Log error or handle as needed
            pass
