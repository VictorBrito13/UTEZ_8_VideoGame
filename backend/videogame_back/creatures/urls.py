from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreatureViewSet, UserCreatureViewSet

router = DefaultRouter()
router.register("pokedex", CreatureViewSet, basename="pokedex")
router.register("my-creatures", UserCreatureViewSet, basename="my-creatures")

urlpatterns = [
  # Legacy support for VID-012 routes under /api/creatures/
  path(
    "",
    CreatureViewSet.as_view({"get": "list"}),
    name="creature-list-legacy",
  ),
  path(
    "<int:pk>/",
    CreatureViewSet.as_view({"get": "retrieve"}),
    name="creature-detail-legacy",
  ),
  path("", include(router.urls)),
]
