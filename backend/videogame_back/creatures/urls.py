from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreatureViewSet, UserCreatureViewSet

router = DefaultRouter()
router.register("pokedex", CreatureViewSet, basename="pokedex")
router.register("my-creatures", UserCreatureViewSet, basename="my-creatures")

urlpatterns = [
  path("", include(router.urls)),
]
