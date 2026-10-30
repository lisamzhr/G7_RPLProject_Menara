FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install ai module first
COPY ai/ /app/ai/
RUN pip install --no-cache-dir /app/ai

# Copy and install backend module
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN pip install --no-cache-dir .

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
