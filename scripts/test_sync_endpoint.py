#!/usr/bin/env python3
"""
Test the /api/sync endpoint to simulate Cloud Scheduler behavior.
"""
import sys
from pathlib import Path

# Add parent directory to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import os
os.environ['STORAGE_BACKEND'] = 'gcs'
os.environ['DRIVE_FOLDER_ID'] = '1U4A3XTHb7j5lJeJvTmMudBmSiHIRT08x'
os.environ['SNAPSHOT_FILE_SUBSTRING'] = 'smart-promos-status-changelog'

from backend.app import app

print("="*70)
print("Testing /api/sync endpoint (simulating Cloud Scheduler)")
print("="*70)
print()

# Create test client
with app.test_client() as client:
    print("Calling POST /api/sync...")
    print()
    
    response = client.post('/api/sync')
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    
    import json
    data = response.get_json()
    print(json.dumps(data, indent=2))
    
    if response.status_code == 200 and data.get('success'):
        print()
        print("✅ Sync successful!")
        print(f"   - Downloaded {data.get('downloaded_files')} files from Drive")
        print(f"   - Processed: {data.get('processed_file')}")
        print(f"   - Compared against: {data.get('compared_against')}")
        print(f"   - Created {data.get('entries_created')} changelog entries")
        print(f"   - Date: {data.get('date')}")
    else:
        print()
        print("❌ Sync failed!")
        if 'error' in data:
            print(f"   Error: {data['error']}")

print()
print("="*70)
