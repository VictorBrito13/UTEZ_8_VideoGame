from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("team", views.TeamViewSet, basename="team")
router.register("profile", views.ProfileViewSet, basename="profile")

urlpatterns = [
  path("", include(router.urls)),
  re_path(r"^leaderboard$", views.leaderboard, name="leaderboard"),
]
