FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install AI package first
COPY ai /ai
RUN pip install --no-cache-dir /ai

# Install backend dependencies
COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application source code
COPY backend/ .

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]