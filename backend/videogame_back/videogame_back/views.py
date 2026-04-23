"""Project-level HTTP views (health checks, error handlers, etc.)."""

from django.http import JsonResponse
from django.shortcuts import render


def health(request):
  """Lightweight liveness probe for load balancers and Cloud Run."""
  return JsonResponse({"status": "ok"})


def bad_request_400(request, exception=None):
  """Handle 400 Bad Request errors."""
  context = {
    "error_code": 400,
    "error_label": "Battle System Alert",
    "error_title": "Invalid Command",
    "error_message": (
      "Your action could not be executed because the data sent to the server "
      "does not match the expected format. Review the request and try again."
    ),
    "error_tip": (
      "Tactical tip: validate required fields, data types, "
      "and JSON structure before resubmitting."
    ),
    "error_footer": "Status code: 400 | Bad Request",
  }
  return render(request, '400.html', context=context, status=400)


def not_found_404(request, exception=None):
  """Handle 404 Not Found errors using the shared 400 template."""
  context = {
    "error_code": 404,
    "error_label": "Battle Route Lost",
    "error_title": "Route Not Found",
    "error_message": (
      "The page you are trying to open does not exist or was moved. "
      "Check the route and return to the main menu."
    ),
    "error_tip": (
      "Tactical tip: check the URL or navigate from the dashboard "
      "to find a valid route."
    ),
    "error_footer": "Status code: 404 | Not Found",
  }
  return render(request, '400.html', context=context, status=404)


def server_error_500(request, template_name='500.html'):
  """Handle 500 Internal Server errors."""
  return render(request, template_name, status=500)
