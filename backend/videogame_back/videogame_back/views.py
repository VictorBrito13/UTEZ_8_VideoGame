"""Project-level HTTP views (health checks, etc.)."""

from django.http import JsonResponse


def health(request):
  """Lightweight liveness probe for load balancers and Cloud Run."""
  return JsonResponse({"status": "ok"})
