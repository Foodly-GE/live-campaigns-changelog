#!/usr/bin/env python3
"""
Clean slate rebuild: Process all local simulation files chronologically.
This will empty GCS and rebuild the complete changelog history.
"""
import sys
from pathlib import Path
from datetime import datetime

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import os
os.environ['STORAGE_BACKEND'] = 'gcs'

from backend.services.changelog import compare_snapshots
from backend.utils.csv_parser import load_snapshot
from backend.utils.gcs_storage import GCSStorage

print("="*70)
print("Clean Slate Rebuild from Local Simulation Files")
print("="*70)
print()

# Initialize storage
storage = GCSStorage('campaign-changelog-data', 'industrial-gist-470307-k4')

# Get all local CSV files
sim_dir = project_root / 'sim-smart-promos-changelog'
csv_files = sorted(sim_dir.glob('*.csv'))

print(f"Found {len(csv_files)} local files:")
for f in csv_files:
    print(f"  - {f.name}")
print()

# Clear existing data
print("Clearing existing GCS data...")
storage.save_changelog([])
storage.save_master_state({
    'last_processed': None,
    'campaigns': {}
})
print("  ✅ GCS cleared")
print()

# Process each file chronologically
previous_df = None
all_entries = []

for i, file_path in enumerate(csv_files):
    # Extract date from filename (feb3 -> 2026-02-03)
    filename = file_path.name.lower()
    if 'feb3' in filename:
        process_date = datetime(2026, 2, 3)
    elif 'feb4' in filename:
        process_date = datetime(2026, 2, 4)
    elif 'feb5' in filename:
        process_date = datetime(2026, 2, 5)
    elif 'feb6' in filename:
        process_date = datetime(2026, 2, 6)
    elif 'feb7' in filename:
        process_date = datetime(2026, 2, 7)
    elif 'feb8' in filename:
        process_date = datetime(2026, 2, 8)
    elif 'feb9' in filename:
        process_date = datetime(2026, 2, 9)
    else:
        print(f"  ⚠️  Skipping {file_path.name} - couldn't parse date")
        continue
    
    print(f"[{i+1}/{len(csv_files)}] Processing: {file_path.name}")
    print(f"  Date: {process_date.strftime('%Y-%m-%d')}")
    
    # Load current snapshot
    current_df = load_snapshot(file_path)
    print(f"  Rows: {len(current_df)}")
    
    # Compare with previous
    entries = compare_snapshots(previous_df, current_df, process_date)
    
    print(f"  Entries: {len(entries)}")
    if entries:
        starts = sum(1 for e in entries if e['event_type'] == 'campaign-start')
        ends = sum(1 for e in entries if e['event_type'] == 'campaign-end')
        updates = sum(1 for e in entries if e['event_type'] == 'campaign-update')
        print(f"    - campaign-start: {starts}")
        print(f"    - campaign-end: {ends}")
        print(f"    - campaign-update: {updates}")
        
        # Collect entries (will save all at once at the end)
        all_entries.extend(entries)
    
    print()
    
    # Current becomes previous for next iteration
    previous_df = current_df

# Save all entries at once to avoid rate limits
print("="*70)
print("Saving all entries to GCS...")
storage.save_changelog(all_entries)
print(f"  ✅ Saved {len(all_entries)} entries")
print()

# Update master state
print("="*70)
print("Updating master state...")
state = storage.load_master_state()
state['last_processed'] = datetime.now().isoformat()
state['backfill_completed'] = True
state['backfill_source'] = 'local_simulation_files'
state['backfill_date_range'] = '2026-02-03 to 2026-02-09'
storage.save_master_state(state)
print("  ✅ Master state updated")
print()

# Summary
print("="*70)
print("Rebuild Complete!")
print("="*70)
dates = storage.get_changelog_dates()
print(f"Changelog dates: {dates}")
print(f"Total entries: {len(all_entries)}")
print()

from collections import Counter
all_entries = storage.load_changelog()
date_counts = Counter(e.get('date') for e in all_entries)
print("Entries by date:")
for date in sorted(date_counts.keys()):
    print(f"  {date}: {date_counts[date]} entries")
print()
print("✅ GCS is now ready for Cloud Scheduler to take over!")
print("   Next run will compare latest Drive file vs Feb 9")
