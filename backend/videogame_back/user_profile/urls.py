from django.urls import re_path

from . import views

urlpatterns = [
  re_path(r"^leaderboard$", views.leaderboard, name="leaderboard"),
]
