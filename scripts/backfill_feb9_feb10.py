#!/usr/bin/env python3
"""
One-time script to backfill Feb 9 and Feb 10 changelog entries.
- Feb 9: Compare local Feb 8 vs Drive Feb 9
- Feb 10: Compare Drive Feb 9 vs Drive Feb 10
"""
import sys
from pathlib import Path
from datetime import datetime

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import os
os.environ['STORAGE_BACKEND'] = 'gcs'
os.environ['DRIVE_FOLDER_ID'] = '1U4A3XTHb7j5lJeJvTmMudBmSiHIRT08x'

from backend.services.changelog import compare_snapshots
from backend.utils.csv_parser import load_snapshot, load_snapshot_from_bytes
from backend.utils.gcs_storage import GCSStorage
from backend.services.drive_client import DriveClient

print("="*70)
print("Backfilling Feb 9 and Feb 10 Changelog Entries")
print("="*70)
print()

# Initialize
storage = GCSStorage('campaign-changelog-data', 'industrial-gist-470307-k4')
drive_client = DriveClient()

# Get files from Drive
drive_files = drive_client.list_files()
drive_files.sort(key=lambda x: x['modifiedTime'])

print(f"Found {len(drive_files)} files in Drive:")
for f in drive_files:
    print(f"  {f['modifiedTime']}: {f['name']}")
print()

# Load local Feb 8 file
local_feb8_path = project_root / 'sim-smart-promos-changelog' / 'sim_ smart-promos-changelog files - feb8.csv'
print(f"Loading local Feb 8 file: {local_feb8_path}")
feb8_df = load_snapshot(local_feb8_path)
print(f"  Loaded {len(feb8_df)} rows")
print()

# Download Feb 9 from Drive
feb9_file = drive_files[0]  # Oldest file (Feb 9)
print(f"Downloading Feb 9 from Drive: {feb9_file['modifiedTime']}")
feb9_content = drive_client.download_file(feb9_file['id'])
feb9_df = load_snapshot_from_bytes(feb9_content)
print(f"  Loaded {len(feb9_df)} rows")
print()

# Download Feb 10 from Drive
feb10_file = drive_files[1]  # Newest file (Feb 10)
print(f"Downloading Feb 10 from Drive: {feb10_file['modifiedTime']}")
feb10_content = drive_client.download_file(feb10_file['id'])
feb10_df = load_snapshot_from_bytes(feb10_content)
print(f"  Loaded {len(feb10_df)} rows")
print()

# Remove existing Feb 9 and Feb 10 entries if any
print("Removing any existing Feb 9 and Feb 10 entries...")
all_entries = storage.load_changelog()
filtered = [e for e in all_entries if e.get('date') not in ['2026-02-09', '2026-02-10']]
removed = len(all_entries) - len(filtered)
if removed > 0:
    storage.save_changelog(filtered)
    print(f"  Removed {removed} existing entries")
else:
    print("  No existing entries to remove")
print()

# Process Feb 9 (compare Feb 8 vs Feb 9)
print("="*70)
print("Processing Feb 9 (Feb 8 vs Feb 9)")
print("="*70)
from dateutil import parser
feb9_date = parser.parse(feb9_file['modifiedTime'])
feb9_entries = compare_snapshots(feb8_df, feb9_df, feb9_date)

print(f"Generated {len(feb9_entries)} entries for Feb 9:")
starts = sum(1 for e in feb9_entries if e['event_type'] == 'campaign-start')
ends = sum(1 for e in feb9_entries if e['event_type'] == 'campaign-end')
updates = sum(1 for e in feb9_entries if e['event_type'] == 'campaign-update')
print(f"  - campaign-start: {starts}")
print(f"  - campaign-end: {ends}")
print(f"  - campaign-update: {updates}")

storage.append_changelog_entries(feb9_entries)
print("  ✅ Saved to GCS")
print()

# Process Feb 10 (compare Feb 9 vs Feb 10)
print("="*70)
print("Processing Feb 10 (Feb 9 vs Feb 10)")
print("="*70)
feb10_date = parser.parse(feb10_file['modifiedTime'])
feb10_entries = compare_snapshots(feb9_df, feb10_df, feb10_date)

print(f"Generated {len(feb10_entries)} entries for Feb 10:")
starts = sum(1 for e in feb10_entries if e['event_type'] == 'campaign-start')
ends = sum(1 for e in feb10_entries if e['event_type'] == 'campaign-end')
updates = sum(1 for e in feb10_entries if e['event_type'] == 'campaign-update')
print(f"  - campaign-start: {starts}")
print(f"  - campaign-end: {ends}")
print(f"  - campaign-update: {updates}")

storage.append_changelog_entries(feb10_entries)
print("  ✅ Saved to GCS")
print()

# Summary
print("="*70)
print("Backfill Complete!")
print("="*70)
dates = storage.get_changelog_dates()
print(f"Changelog now has {len(dates)} dates: {dates}")

from collections import Counter
all_entries = storage.load_changelog()
date_counts = Counter(e.get('date') for e in all_entries)
print()
print("Entries by date:")
for date in sorted(date_counts.keys()):
    print(f"  {date}: {date_counts[date]} entries")
print(f"\nTotal: {len(all_entries)} entries")
