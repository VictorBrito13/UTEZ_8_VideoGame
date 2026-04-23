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
    "error_title": "Comando Inválido",
    "error_message": (
      "Tu accion no pudo ejecutarse porque los datos enviados al servidor "
      "no tienen el formato esperado. Revisa la solicitud y vuelve a intentarlo."
    ),
    "error_tip": (
      "Consejo tactico: valida campos obligatorios, tipos de datos "
      "y estructura JSON antes de reenviar."
    ),
    "error_footer": "Codigo de estado: 400 | Bad Request",
  }
  return render(request, '400.html', context=context, status=400)


def not_found_404(request, exception=None):
  """Handle 404 Not Found errors using the shared 400 template."""
  context = {
    "error_code": 404,
    "error_label": "Battle Route Lost",
    "error_title": "Ruta No Encontrada",
    "error_message": (
      "La pagina que intentas abrir no existe o fue movida. "
      "Verifica la ruta y vuelve al menu principal."
    ),
    "error_tip": (
      "Consejo tactico: revisa la URL o navega desde el tablero "
      "para encontrar una ruta valida."
    ),
    "error_footer": "Codigo de estado: 404 | Not Found",
  }
  return render(request, '400.html', context=context, status=404)


def server_error_500(request, template_name='500.html'):
  """Handle 500 Internal Server errors."""
  return render(request, template_name, status=500)
