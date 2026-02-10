# Admin Page Documentation

## Overview

The Admin page provides system monitoring and manual control over the snapshot processing pipeline.

## Features

### 1. Last Processed Status
- Shows when the last snapshot comparison was run
- Displays time ago (e.g., "2 hours ago")
- Shows the modification times of the compared snapshots
- Helps verify the system is running as expected

### 2. Next Scheduled Run
- Displays when the next automated run will occur
- Shows countdown timer (e.g., "In 5h 23m")
- References the Cloud Scheduler job name: `campaign-changelog-sync`
- Confirms daily schedule: 9:00 AM UTC

### 3. Manual Processing Button
- Allows manual triggering of snapshot processing
- Shows real-time processing status with spinner
- Displays success/failure results with details:
  - Number of changelog entries created
  - Files compared from Google Drive
  - Timestamps of compared snapshots
- Useful for:
  - Testing after configuration changes
  - Processing new data immediately without waiting for scheduler
  - Troubleshooting issues

### 4. Data Flow Diagram
- Visual explanation of the 4-step processing pipeline:
  1. Download from Google Drive (into memory)
  2. Compare Snapshots (detect changes)
  3. Generate Changelog (create entries)
  4. Persist to GCS (save results)
- Helps users understand how the system works
- No sensitive information exposed (no bucket names, file paths, etc.)

## API Endpoints

### GET /api/admin/state
Returns the current system state from GCS.

**Response:**
```json
{
  "last_processed": "2026-02-10T06:39:51.029417",
  "last_current_file": "smart-promos-status-changelog",
  "last_current_modified": "2026-02-10T02:01:15.378Z",
  "last_previous_file": "smart-promos-status-changelog",
  "last_previous_modified": "2026-02-09T02:03:11.282Z",
  "backfill_completed": true,
  "campaigns": {}
}
```

### POST /api/sync
Triggers manual snapshot processing (same endpoint used by Cloud Scheduler).

**Response:**
```json
{
  "success": true,
  "files_in_drive": 3,
  "current_file": "smart-promos-status-changelog",
  "current_modified": "2026-02-10T02:01:15.378Z",
  "previous_file": "smart-promos-status-changelog",
  "previous_modified": "2026-02-09T02:03:11.282Z",
  "entries_created": 67,
  "date": "2026-02-10"
}
```

## Security

- Page is protected by IAP (Identity-Aware Proxy)
- Only @foodly.ge domain users can access
- Manual trigger uses same authentication as Cloud Scheduler
- No sensitive credentials or asset names exposed in UI

## Design Decisions

### Why Not Show Asset Names?
- Keeps UI clean and user-friendly
- Focuses on operational status, not infrastructure details
- Cloud Scheduler job name is shown as it's user-facing

### Why Show Cloud Scheduler Name?
- `campaign-changelog-sync` is a user-facing identifier
- Helps with troubleshooting and monitoring
- Can be referenced in GCP console for detailed logs

### Time Display
- All times shown in user's local timezone
- UTC times used internally for consistency
- Relative times ("2 hours ago") for quick understanding
- Absolute times for precise reference

## Usage

### Normal Operation
1. Check "Last Processed" to verify system is running
2. Check "Next Scheduled Run" to see when next update occurs
3. No action needed if everything is green

### Manual Processing
1. Click "Process Snapshots Now" button
2. Wait for processing (usually 5-10 seconds)
3. Review success message with entry count
4. Check Changelog page to see new entries

### Troubleshooting
1. If "Last Processed" is old (>24 hours):
   - Check Cloud Scheduler job status in GCP console
   - Check Cloud Run logs for errors
   - Try manual trigger to test
2. If manual trigger fails:
   - Check error message
   - Verify Google Drive has recent files
   - Check service account permissions
