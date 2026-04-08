import threading

_local = threading.local()


def get_current_user():
    return getattr(_local, "user", None)


def get_current_ip():
    return getattr(_local, "ip", None)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.user = request.user if request.user.is_authenticated else None

        # Detectar IP real (proxy o local)
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            _local.ip = x_forwarded_for.split(",")[0]
        else:
            _local.ip = request.META.get("REMOTE_ADDR")

        return self.get_response(request)