from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework_simplejwt.views import (
  TokenObtainPairView,
  TokenRefreshView,
)

from . import views
from user_profile import views as user_profile_views

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
  path("admin", admin.site.urls),
  path("api/health", views.health, name="health"),
  path("api/login", TokenObtainPairView.as_view(), name="token_obtain_pair"),
  path("api/token/refresh", TokenRefreshView.as_view(), name="token_refresh"),
  path("api/register", user_profile_views.register, name="register"),
  path("api/", include("ranking.urls")),
  path("api/", include("user_profile.urls")),
  path("api/", include("inventory.urls")),
  path("api/creatures/", include("creatures.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Error handlers for production
handler404 = 'videogame_back.views.not_found_404'
handler400 = 'videogame_back.views.bad_request_400'
handler500 = 'videogame_back.views.server_error_500'