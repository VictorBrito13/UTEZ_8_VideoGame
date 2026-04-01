from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework_simplejwt.views import (
  TokenObtainPairView,
  TokenRefreshView,
)

from . import views
from user_profile import views as user_profile_views

urlpatterns = [
  path("admin/", admin.site.urls),
  path("api/health", views.health, name="health"),
  path("api/login", TokenObtainPairView.as_view(), name="token_obtain_pair"),
  path("api/token/refresh", TokenRefreshView.as_view(), name="token_refresh"),
  path("api/register", user_profile_views.register, name="register"),
  path("api/", include("user_profile.urls")),
]
