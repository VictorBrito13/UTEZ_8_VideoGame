from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.core.exceptions import ObjectDoesNotExist, ValidationError

from .models import Inventory
from .serializers import InventorySerializer
from .services import use_object


class InventoryViewSet(viewsets.ModelViewSet):
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter items with quantity > 0 (RF-07) and own user (R6.1)
        # Note: Inventory model is 1-to-1 with User.
        return Inventory.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        # Custom retrieve to ensure filtered items are returned even when fetching single inventory
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        # Filter nested items manually in the response if needed, 
        # but better to handle it in serializer or filtered queryset.
        data['items'] = [item for item in data['items'] if item['quantity'] > 0]
        return Response(data)

    def list(self, request, *args, **kwargs):
        # For listing, we apply the same logic
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        for inventory in serializer.data:
            inventory['items'] = [item for item in inventory['items'] if item['quantity'] > 0]
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="use-object")
    def use_object_endpoint(self, request):

        object_id = request.data.get("object_id")
        creature_id = request.data.get("creature_id")

        # Validación básica (evita errores innecesarios)
        if not object_id:
            return Response(
                {"error": "object_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = use_object(
                user=request.user,
                object_id=object_id,
                target_creature_id=creature_id,
            )

            return Response(result, status=status.HTTP_200_OK)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Inventory or object not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )