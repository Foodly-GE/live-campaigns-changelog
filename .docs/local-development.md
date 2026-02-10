# Local Development Guide

This guide explains how to run the Campaign Tracker application locally for development and testing.

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

## Project Structure

```
.
├── backend/          # Flask API server
├── frontend/         # React + Vite frontend
├── data/            # Data files (snapshots, changelog, state)
└── .docs/           # Documentation
```

## Running the Application Locally

### Option 1: Development Mode (Recommended)

Run the backend and frontend separately for hot-reloading during development.

#### 1. Start the Backend API

```bash
# From project root
python backend/app.py
```

The backend will start on `http://localhost:8080`

#### 2. Start the Frontend Dev Server

```bash
# In a new terminal
cd frontend
npm install  # First time only
npm run dev
```

The frontend dev server will start on `http://localhost:5173` (or another port if 5173 is busy)

### Option 2: Production Mode

Build the frontend and serve everything through the Flask backend.

```bash
# Build the frontend
cd frontend
npm install  # First time only
npm run build
cd ..

# Start the backend (serves built frontend)
python backend/app.py
```

Access the application at `http://localhost:8080`

## Environment Variables

- `PORT` - Server port (default: 8080)
- `DATA_DIR` - Path to data directory (default: `./data`)

Example:
```bash
PORT=3000 DATA_DIR=/path/to/data python backend/app.py
```

## Development Workflow

1. **Backend changes**: The Flask server runs in debug mode and will auto-reload on code changes
2. **Frontend changes**: Vite dev server provides instant hot-module replacement (HMR)
3. **API testing**: Backend API is available at `http://localhost:8080/api/*`

## API Endpoints

- `GET /api/changelog` - Get changelog data
- `GET /api/calendar` - Get calendar data
- `GET /api/banners` - Get banner actions data
- `POST /api/process` - Process new snapshot file

## Deployment

This application is designed to be deployed on Google Cloud Run. The `Dockerfile` and `cloudbuild.yaml` handle the production build and deployment.

### Cloud Run Deployment

```bash
gcloud builds submit --config cloudbuild.yaml
```

The Dockerfile:
1. Builds the frontend static assets
2. Copies them to the Flask static folder
3. Runs the Flask server on the port specified by Cloud Run

## Troubleshooting

### Port Already in Use

If port 8080 is busy, specify a different port:
```bash
PORT=8081 python backend/app.py
```

### Frontend Can't Connect to Backend

Make sure CORS is enabled in `backend/app.py` (it is by default for development).

### Data Not Loading

Ensure the `data/` directory exists with:
- `data/snapshots/` - CSV snapshot files
- `data/history/changelog_log.json` - Changelog entries
- `data/state/master_state.json` - Application state
