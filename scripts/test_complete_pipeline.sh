#!/bin/bash
# Complete pipeline test

echo "=========================================="
echo "Complete Pipeline Test"
echo "=========================================="
echo

echo "1. Checking GCS structure..."
gsutil ls -r gs://campaign-changelog-data/
echo

echo "2. Checking Google Drive files..."
python3 -c "
import sys
sys.path.insert(0, '.')
import os
os.environ['DRIVE_FOLDER_ID'] = '1U4A3XTHb7j5lJeJvTmMudBmSiHIRT08x'
from backend.services.drive_client import DriveClient
client = DriveClient()
files = client.list_files()
print(f'Found {len(files)} files in Drive')
for f in sorted(files, key=lambda x: x['modifiedTime'], reverse=True):
    print(f\"  - {f['modifiedTime']}: {f['name']}\")
"
echo

echo "3. Testing sync endpoint..."
python3 scripts/test_sync_endpoint.py | grep -A 15 "✅"
echo

echo "4. Checking changelog entries..."
python3 -c "
import sys
sys.path.insert(0, '.')
import os
os.environ['STORAGE_BACKEND'] = 'gcs'
from backend.utils.gcs_storage import GCSStorage
storage = GCSStorage('campaign-changelog-data', 'industrial-gist-470307-k4')
entries = storage.load_changelog()
dates = storage.get_changelog_dates()
print(f'Total changelog entries: {len(entries)}')
print(f'Dates covered: {dates}')
print(f'Latest date: {dates[-1] if dates else None}')
"
echo

echo "=========================================="
echo "Pipeline test complete!"
echo "=========================================="
