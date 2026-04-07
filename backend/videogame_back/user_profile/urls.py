from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("team", views.TeamViewSet, basename="team")
router.register("profile", views.ProfileViewSet, basename="profile")
router.register("user-creatures", views.UserCreatureViewSet, basename="usercreature")

urlpatterns = [
  path("leaderboard", views.leaderboard, name="leaderboard"),
  path("", include(router.urls)),
]
