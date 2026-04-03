from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreatureViewSet

router = DefaultRouter()
router.register(r'creatures', CreatureViewSet, basename='creature')

urlpatterns = [
    path('', include(router.urls)),
]
