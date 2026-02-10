# Campaign Tracker

A web application for tracking campaign changes, calendar views, and banner actions. Built with Flask (backend) and React + Vite (frontend).

## Features

- **Changelog**: Track campaign starts, updates, and ends with detailed diff views
- **Calendar**: View live, scheduled, and finished campaigns with time series visualization
- **Banners**: Monitor banner action requests (start, update, end)
- **Dark Mode**: Toggle between light, dark, and system themes
- **Advanced Filtering**: Filter by account manager, spend objective, bonus type, provider, and city
- **Responsive Design**: Built with shadcn/ui components and Tailwind CSS

## Quick Start

### 1. Simple Startup (Combined Logs)

If you just want to run everything in one container:

```bash
# Build
docker build -t campaign-tracker .

# Run (Ensure no spaces after the backslashes!)
docker run -p 8080:8080 \
  -v ~/.config/gcloud:/root/.config/gcloud \
  campaign-tracker
```

### 2. Development Startup (Separate Logs)

For better development with **separate logs**, **hot-reloading**, and **separate frontend/backend services**, use Docker Compose.

**The configuration (`docker-compose.yml`):**

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - ~/.config/gcloud:/root/.config/gcloud
    environment:
      - PORT=8080
      - ENVIRONMENT=development
      - STORAGE_BACKEND=gcs
    command: python backend/app.py

  frontend:
    image: node:22-alpine
    working_dir: /app/frontend
    volumes:
      - ./frontend:/app/frontend
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"
    environment:
      - VITE_API_URL=http://localhost:8080
```

**Commands:**

```bash
# Start both services
docker-compose up -d

# View separate logs
docker-compose logs -f backend   # Just backend logs
docker-compose logs -f frontend  # Just frontend logs
docker-compose logs -f           # Both logs (interleaved)

> **Tip**: To view logs truly side-by-side, split your terminal into two panes (e.g., `Cmd + \` in VS Code) and run the backend and frontend log commands in their respective panes.
```

### 3. Shutdown

```bash
# If using docker run:
Press Ctrl+C

# If using docker-compose:
docker-compose down
```



## Documentation

See [.docs/local-development.md](.docs/local-development.md) for detailed setup instructions, environment variables, and deployment information.

## Project Structure

```
.
├── backend/              # Flask API server
│   ├── app.py           # Main application entry point
│   ├── services/        # Business logic (changelog, calendar, etc.)
│   └── utils/           # Utilities (CSV parsing, storage)
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (changelog, calendar, banners)
│   │   └── hooks/       # Custom React hooks
│   └── dist/            # Built static files (production)
└── .docs/               # Documentation
```

**Data Storage:** All data (snapshots, changelog, state) is stored in GCS bucket `gs://campaign-changelog-data/`

## Tech Stack

**Backend**:
- Flask (Python web framework)
- Pandas (data processing)
- Flask-CORS (cross-origin support)

**Frontend**:
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui components
- Recharts (data visualization)

## Deployment

Designed for Google Cloud Run. See `Dockerfile` and `cloudbuild.yaml` for deployment configuration.

```bash
gcloud builds submit --config cloudbuild.yaml
```

## License

Proprietary

Redeploy trigger: 2026-02-10T01:00:00Z
