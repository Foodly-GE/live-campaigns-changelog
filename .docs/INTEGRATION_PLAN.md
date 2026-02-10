# Integration Plan: Google Drive & Deployment

## Overview

This document outlines the approach for:
1. Integrating Google Drive to access daily snapshot CSV files
2. Transitioning from mockup data to production data management

---

## Part 1: Google Drive Integration

### Current State
- Snapshot files are stored locally in `data/snapshots/`
- Backend reads from local filesystem via `csv_parser.py`
- Files follow naming convention: `sim_ smart-promos-changelog files - feb3.csv`

### Goal
Access daily snapshot files automatically from a shared Google Drive folder.

### Approach Options

#### Option A: Google Drive API (Recommended for Production)

**Setup:**
1. Create a Google Cloud project
2. Enable Google Drive API
3. Create a Service Account with Drive access
4. Share the Drive folder with the service account email

**Implementation:**
```python
# backend/services/drive_client.py
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

class DriveClient:
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    
    def __init__(self, credentials_path: str, folder_id: str):
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=self.SCOPES
        )
        self.service = build('drive', 'v3', credentials=credentials)
        self.folder_id = folder_id
    
    def list_files(self) -> list:
        """List all CSV files in the watched folder."""
        query = f"'{self.folder_id}' in parents and mimeType='text/csv'"
        results = self.service.files().list(
            q=query,
            fields="files(id, name, modifiedTime)"
        ).execute()
        return results.get('files', [])
    
    def download_file(self, file_id: str) -> bytes:
        """Download file content."""
        request = self.service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buffer.getvalue()
    
    def get_latest_snapshot(self) -> tuple[str, bytes]:
        """Get the most recent snapshot file."""
        files = self.list_files()
        if not files:
            return None, None
        # Sort by modified time (newest first)
        files.sort(key=lambda x: x['modifiedTime'], reverse=True)
        latest = files[0]
        content = self.download_file(latest['id'])
        return latest['name'], content
```

**Environment Variables:**
```bash
GOOGLE_CREDENTIALS_PATH=/path/to/service-account.json
GOOGLE_DRIVE_FOLDER_ID=1abc123xyz...
```

**Pros:**
- Full API control
- Works in any environment
- Can watch for changes with webhooks

**Cons:**
- Requires service account setup
- More complex authentication

---

#### Option B: Shared Drive Link with Direct Download (Simpler)

If files are shared publicly:
```python
import requests
import pandas as pd
from io import StringIO

def download_from_drive_link(share_url: str) -> pd.DataFrame:
    """Download CSV from Google Drive share link."""
    # Convert share link to direct download URL
    file_id = extract_file_id(share_url)
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    response = requests.get(download_url)
    response.raise_for_status()
    
    return pd.read_csv(StringIO(response.text))
```

**Pros:**
- Simple setup
- No API credentials needed

**Cons:**
- Requires manual file ID management
- Less control over folder watching

---

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Google Drive                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │   Shared Folder: "Smart Promos Daily Snapshots"         │    │
│  │   - 2026-02-08.csv                                       │    │
│  │   - 2026-02-09.csv                                       │    │
│  │   - 2026-02-10.csv   ← Daily uploads by data team       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Google Drive API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Campaign Tracker Backend                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │   DriveClient                                            │    │
│  │   - Check for new files (on schedule or request)         │    │
│  │   - Download new snapshots to local cache               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │   Local Cache (data/snapshots/)                          │    │
│  │   - Cached copies for processing                         │    │
│  │   - Retain last N days for diff generation              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │   Changelog Service                                      │    │
│  │   - Compare today vs yesterday                           │    │
│  │   - Generate change events                               │    │
│  │   - Store in changelog_log.json                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Steps

1. **Add Dependencies:**
   ```txt
   # requirements.txt
   google-api-python-client>=2.0.0
   google-auth>=2.0.0
   google-auth-oauthlib>=1.0.0
   ```

2. **Create Service Account:**
   - Go to Google Cloud Console
   - Create project or use existing
   - Enable Drive API
   - Create Service Account → Download JSON key
   - Share Drive folder with service account email

3. **Update Storage Service:**
   ```python
   # backend/utils/storage.py - Add method
   
   def sync_from_drive(self, drive_client: DriveClient):
       """Sync latest snapshots from Google Drive."""
       files = drive_client.list_files()
       
       for file in files:
           local_path = self.snapshots_dir / file['name']
           if not local_path.exists():
               content = drive_client.download_file(file['id'])
               local_path.write_bytes(content)
               print(f"Downloaded: {file['name']}")
   ```

4. **Add Scheduled Sync:**
   - Use Cloud Scheduler (GCP) or cron job
   - Endpoint: `POST /api/sync` (protected)
   - Or background task on app startup

---

## Part 2: Deployment File Management Strategy

### Current Mockup State
```
data/
├── snapshots/           # CSV files (simulation data)
├── history/
│   └── changelog_log.json
├── state/
│   └── master_state.json
└── simulation-data/     # Testing files
```

### Production Architecture

#### Option A: Cloud Storage (GCS) - Recommended for GCP

```
┌─────────────────────────────────────────────────────────────────┐
│                  Google Cloud Storage                            │
│  bucket: campaign-tracker-data                                   │
│  ├── snapshots/                                                  │
│  │   ├── 2026-02-08.csv                                         │
│  │   └── 2026-02-09.csv                                         │
│  ├── state/                                                      │
│  │   └── master_state.json                                       │
│  └── history/                                                    │
│      └── changelog_log.json                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```python
# backend/utils/gcs_storage.py
from google.cloud import storage as gcs

class GCSStorage(Storage):
    def __init__(self, bucket_name: str):
        self.client = gcs.Client()
        self.bucket = self.client.bucket(bucket_name)
    
    def load_master_state(self) -> dict:
        blob = self.bucket.blob('state/master_state.json')
        if not blob.exists():
            return {'last_processed': None, 'campaigns': {}}
        return json.loads(blob.download_as_text())
    
    def save_master_state(self, state: dict):
        blob = self.bucket.blob('state/master_state.json')
        blob.upload_from_string(json.dumps(state, indent=2))
    
    # ... similar methods for changelog
```

#### Option B: Persistent Volume (Kubernetes/Cloud Run)

For simpler deployments, mount a persistent volume:

```yaml
# cloudbuild.yaml addition
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/campaign-tracker', '.']

# Cloud Run with mounted GCS bucket via Cloud Storage FUSE
```

### Recommended Deployment Strategy

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Production Architecture                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │
│   │  Google     │    │  Cloud Run  │    │  Google Cloud Storage       │  │
│   │  Drive      │───▶│  Service    │◀──▶│  (campaign-tracker-data)    │  │
│   │  (Source)   │    │  (Backend)  │    │                             │  │
│   └─────────────┘    └──────┬──────┘    │  ├── snapshots/             │  │
│                             │           │  ├── state/master_state.json│  │
│                             │           │  └── history/changelog.json │  │
│                      ┌──────┴──────┐    └─────────────────────────────┘  │
│                      │  Cloud      │                                      │
│                      │  Scheduler  │ ← Daily sync trigger (e.g., 6 AM)   │
│                      └─────────────┘                                      │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### Migration Steps

1. **Create GCS Bucket:**
   ```bash
   gsutil mb gs://campaign-tracker-data
   gsutil iam ch serviceAccount:$SA_EMAIL:objectAdmin gs://campaign-tracker-data
   ```

2. **Update Backend Settings:**
   ```python
   # backend/config.py
   import os
   
   class Config:
       STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'local')  # 'local' | 'gcs'
       GCS_BUCKET = os.getenv('GCS_BUCKET', 'campaign-tracker-data')
       DRIVE_FOLDER_ID = os.getenv('DRIVE_FOLDER_ID', '')
       
   # Factory pattern
   def get_storage():
       if Config.STORAGE_BACKEND == 'gcs':
           return GCSStorage(Config.GCS_BUCKET)
       return Storage(DATA_DIR)
   ```

3. **Update Dockerfile:**
   ```dockerfile
   # Add Google Cloud SDK for storage access
   ENV GOOGLE_CLOUD_PROJECT=your-project-id
   
   # The service account is automatically available in Cloud Run
   ```

4. **Set Up Cloud Scheduler:**
   ```bash
   gcloud scheduler jobs create http sync-snapshots \
     --schedule="0 6 * * *" \
     --uri="https://your-service-url.run.app/api/sync" \
     --http-method=POST \
     --oidc-service-account-email=$SA_EMAIL
   ```

### Environment-Based Configuration

```python
# backend/app.py
import os

# Choose storage backend based on environment
if os.getenv('ENVIRONMENT') == 'production':
    storage = GCSStorage(os.getenv('GCS_BUCKET'))
    drive_client = DriveClient(
        credentials_path='/secrets/drive-credentials.json',
        folder_id=os.getenv('DRIVE_FOLDER_ID')
    )
else:
    # Local development uses filesystem
    storage = Storage(DATA_DIR)
    drive_client = None
```

---

## Summary: Implementation Checklist

### Phase 1: Google Drive Integration
- [ ] Create Google Cloud project
- [ ] Enable Drive API
- [ ] Create service account
- [ ] Implement `DriveClient` class
- [ ] Add sync endpoint `/api/sync`
- [ ] Test with real Drive folder

### Phase 2: Cloud Storage Migration
- [ ] Create GCS bucket
- [ ] Implement `GCSStorage` class
- [ ] Add environment-based storage factory
- [ ] Update Docker/Cloud Run config
- [ ] Migrate existing data to GCS

### Phase 3: Automation
- [ ] Set up Cloud Scheduler for daily sync
- [ ] Add monitoring/alerting
- [ ] Implement error handling & retries
- [ ] Add admin dashboard for manual sync trigger

---

## Alternative: Simpler Setup (For Smaller Scale)

If the team prefers a simpler approach without full cloud infrastructure:

1. **Manual Upload Flow:**
   - Data team uploads CSV to a specific location
   - Backend has an admin endpoint to trigger processing
   - State files remain on persistent disk

2. **Scheduled Polling:**
   - Cloud Run receives files via Cloud Storage bucket event trigger
   - No Drive API needed - just copy files directly to GCS bucket

```yaml
# Example: Cloud Function triggered by GCS upload
functions:
  process-snapshot:
    trigger: google.cloud.storage.object.v1.finalized
    bucket: campaign-snapshots-incoming
```

This approach trades automation complexity for operational simplicity.
