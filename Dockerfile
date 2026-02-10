FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ backend/
COPY frontend/ frontend/
COPY data/ data/

# Set environment variables
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV PYTHONPATH=/app
ENV ENVIRONMENT=production
ENV STORAGE_BACKEND=gcs
ENV GCS_PROJECT=industrial-gist-470307-k4

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "backend.app:app"]
