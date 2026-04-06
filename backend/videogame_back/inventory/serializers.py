from rest_framework import serializers
from .models import Object, Inventory, InventoryItem


class ObjectSerializer(serializers.ModelSerializer):
  class Meta:
    model = Object
    fields = "__all__"


class InventoryItemSerializer(serializers.ModelSerializer):
  object = ObjectSerializer(read_only=True)

  class Meta:
    model = InventoryItem
    fields = ["id", "object", "quantity"]

  def validate_quantity(self, value):
    if value < 0:
      raise serializers.ValidationError("Quantity cannot be negative")
    return value


class InventorySerializer(serializers.ModelSerializer):
  items = InventoryItemSerializer(many=True, read_only=True)

  class Meta:
    model = Inventory
    fields = "__all__"
