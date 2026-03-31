from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
  serializer = UserRegistrationSerializer(data=request.data)
  if serializer.is_valid():
    user = serializer.save()
    return Response(
      {
        "message": "User registered successfully",
        "id": user.id,
        "username": user.username,
      },
      status=status.HTTP_201_CREATED,
    )

  return Response(
    {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
  )
