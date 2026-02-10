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

### Development Mode

1. **Start the Backend**:
   ```bash
   python backend/app.py
   ```
   Backend runs on `http://localhost:8080`

2. **Start the Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend dev server runs on `http://localhost:5173`

### Production Mode

```bash
cd frontend
npm install
npm run build
cd ..
python backend/app.py
```

Access at `http://localhost:8080`

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
