# Build from repository root with:
#   docker build -f backend/videogame_back/Dockerfile -t backend:latest backend
# Context must be the `backend/` directory so `pyproject.toml` and `uv.lock` are available.

FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/videogame_back

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install locked production dependencies (cached when lockfile unchanged)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

ENV PATH="/app/.venv/bin:$PATH"

COPY videogame_back ./videogame_back/

# Uncomment when static files are collected for production:
# RUN python videogame_back/manage.py collectstatic --noinput

CMD ["sh", "-c", "exec gunicorn videogame_back.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --threads 4"]
