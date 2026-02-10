# Production Architecture

## Overview

The Live Campaigns Changelog application processes daily campaign snapshots from Google Drive and generates changelog entries stored in Google Cloud Storage.

## Data Flow

```
┌─────────────────┐
│  Google Drive   │  Daily CSV snapshots (same filename, different mod times)
│  Folder         │  
└────────┬────────┘
         │
         │ Cloud Scheduler (daily 9 AM UTC)
         │ POST /api/sync
         ▼
┌─────────────────┐
│  Cloud Run      │  1. Download 2 most recent files from Drive
│  Application    │  2. Compare them (sliding window)
│                 │  3. Generate changelog entries
└────────┬────────┘  4. Update GCS
         │
         ▼
┌─────────────────┐
│  GCS Bucket     │  gs://campaign-changelog-data/
│                 │  ├── history/
│                 │  │   └── changelog_log.json  (all changelog entries)
│                 │  └── state/
│                 │      └── master_state.json   (last processed info)
└─────────────────┘
```

## Key Design Decisions

### 1. No Snapshot Storage in GCS
- **Raw CSV files are NOT stored in GCS or on disk**
- Files are downloaded into memory (RAM) only during processing
- Only processed results (changelog + state) are persisted to GCS
- Memory is cleared after each sync request completes
- Reduces storage costs and complexity

### 2. Sliding Window Processing
- Always compare the 2 most recent files from Google Drive
- Files sorted by `modifiedTime` (newest first)
- Each daily run compares: today's snapshot vs yesterday's snapshot

### 3. Google Drive as Source of Truth
- All CSV snapshots live in Google Drive folder
- Files have the same name but different modification times
- Drive API provides modification timestamps for sorting

## GCS Structure

```
gs://campaign-changelog-data/
├── history/
│   └── changelog_log.json       # Array of all changelog entries
└── state/
    └── master_state.json        # Last processed metadata
```

### changelog_log.json
```json
[
  {
    "date": "2026-02-10",
    "event_type": "campaign-start",
    "campaign_hash": "abc123",
    "banner_action": "banner-start",
    "provider_id": "12345",
    "provider_name": "Restaurant Name",
    ...
  }
]
```

### master_state.json
```json
{
  "last_processed": "2026-02-10T09:00:00",
  "last_current_file": "smart-promos-status-changelog",
  "last_current_modified": "2026-02-10T02:01:15.378Z",
  "last_previous_file": "smart-promos-status-changelog",
  "last_previous_modified": "2026-02-09T02:03:11.282Z"
}
```

## Daily Sync Process

### Triggered by Cloud Scheduler
- **Schedule**: Daily at 9:00 AM UTC
- **Endpoint**: `POST /api/sync`
- **Service Account**: `campaign-changelog-sa@industrial-gist-470307-k4.iam.gserviceaccount.com`

### Steps
1. **List files** in Google Drive folder
2. **Sort by modifiedTime** (newest first)
3. **Download 2 most recent files into memory** (not persisted to disk/GCS)
4. **Load as DataFrames** and normalize columns
5. **Compare snapshots** in memory:
   - New campaign hashes → `campaign-start`
   - Removed campaign hashes → `campaign-end`
   - Changed fields → `campaign-update`
6. **Determine banner actions** based on changes
7. **Append entries** to `changelog_log.json` in GCS
8. **Update** `master_state.json` in GCS
9. **Memory is cleared** when request completes

**Note**: Raw CSV files are only held in memory during processing and are never persisted to GCS or disk.

## API Endpoints

### GET /api/changelog
- Returns changelog entries with summary stats
- Supports date filtering
- Groups by event type

### GET /api/calendar
- Downloads latest snapshot from Google Drive
- Classifies campaigns as live/scheduled/finished
- Returns current campaign status

### GET /api/banners
- Returns banner actions from changelog
- Filters to entries with banner_action field
- Groups by banner action type

### POST /api/sync
- Processes latest snapshots from Drive
- Updates changelog and state in GCS
- Returns processing summary

## Configuration

### Environment Variables
```bash
STORAGE_BACKEND=gcs
GCS_PROJECT=industrial-gist-470307-k4
GCS_BUCKET=campaign-changelog-data
DRIVE_FOLDER_ID=1U4A3XTHb7j5lJeJvTmMudBmSiHIRT08x
SNAPSHOT_FILE_SUBSTRING=smart-promos-status-changelog
ENVIRONMENT=production
```

### IAP Protection
- All Cloud Run services are protected by Identity-Aware Proxy
- Only users with @foodly.ge domain can access
- Cloud Scheduler uses service account with Cloud Run Invoker role

## Monitoring

### Cloud Scheduler Job
```bash
gcloud scheduler jobs describe campaign-changelog-sync \
  --location=europe-west1 \
  --project=industrial-gist-470307-k4
```

### Manual Trigger
```bash
gcloud scheduler jobs run campaign-changelog-sync \
  --location=europe-west1 \
  --project=industrial-gist-470307-k4
```

### Check Logs
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=live-campaigns-changelog" \
  --limit=50 \
  --project=industrial-gist-470307-k4
```

## Deployment

### Build and Deploy
```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=COMMIT_SHA=$(git rev-parse --short HEAD) \
  --project=industrial-gist-470307-k4
```

### Service Details
- **Service Name**: `live-campaigns-changelog`
- **Region**: `europe-west1`
- **URL**: `https://live-campaigns-changelog-m5dwlcpm5a-ew.a.run.app`
- **Service Account**: `campaign-changelog-sa@industrial-gist-470307-k4.iam.gserviceaccount.com`

## Permissions

### Service Account Roles
- `roles/run.invoker` - Invoke Cloud Run service
- `roles/storage.objectAdmin` - Read/write GCS bucket
- `roles/drive.readonly` - Read Google Drive folder (via sharing)

### Google Drive Sharing
The service account must be manually shared the Drive folder with Viewer permission.
