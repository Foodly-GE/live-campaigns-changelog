# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ backend/

# Copy built frontend assets from Stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PORT=8080
ENV PYTHONPATH=/app
ENV ENVIRONMENT=production
ENV STORAGE_BACKEND=gcs
ENV GCS_PROJECT=industrial-gist-470307-k4

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "backend.app:app"]
