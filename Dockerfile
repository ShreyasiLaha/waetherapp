# RituGrid — Production Deployment Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies (libnetcdf, hdf5, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libnetcdf-dev \
    libhdf5-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application codebase
COPY src/ ./src/
COPY frontend/dist/ ./frontend/dist/
COPY models/ ./models/
COPY scripts/ ./scripts/
COPY data/output/ ./data/output/
COPY docs/ ./docs/
COPY *.md ./

# Expose API and Dashboard port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI serving layer
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
