from rest_framework import serializers


class ChatMessageSerializer(serializers.Serializer):
  """
  Serializer to validate incoming chat messages via WebSockets.
  Matches RF-17 and R5.1 (Validation).
  """
  message = serializers.CharField(
    min_length=1, max_length=1000, trim_whitespace=True
  )
