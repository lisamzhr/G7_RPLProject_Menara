# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Copy static uv binaries from the official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Configure uv for fast, deterministic, cache-friendly container builds
ENV UV_CACHE_DIR=/root/.cache/uv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# Install minimal runtime system packages with BuildKit apt cache
RUN rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    curl

# Copy only dependency manifests first so code changes do not bust third-party dependency layers
COPY ai/pyproject.toml ai/README.md /ai/
COPY backend/pyproject.toml backend/uv.lock /app/

# Install all third-party dependencies for both roofgarden-ai and roofgarden-backend
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --no-install-package roofgarden-ai --no-dev

# Copy AI and backend application source code (including ai/models/*.pkl and ai/data/profiles/*.json)
COPY ai /ai
COPY backend /app

# Install local editable packages (roofgarden-ai at /ai and roofgarden-backend at /app)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
