"""Project-level HTTP views (health checks, error handlers, etc.)."""

from django.http import JsonResponse
from django.shortcuts import render


def health(request):
  """Lightweight liveness probe for load balancers and Cloud Run."""
  return JsonResponse({"status": "ok"})


def bad_request_400(request, exception=None):
  """Handle 400 Bad Request errors."""
  return render(request, '400.html', status=400)


def server_error_500(request, template_name='500.html'):
  """Handle 500 Internal Server errors."""
  return render(request, template_name, status=500)
