#!/usr/bin/env python3
"""
Backfill script to process all simulation data files and generate changelog entries.
Simulates how the real-world app would look after 6 days of its life.
"""
import sys
from pathlib import Path
from datetime import datetime

# Add parent directories to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.services.changelog import compare_snapshots
from backend.utils.csv_parser import load_snapshot, extract_date_from_filename
from backend.utils.storage import Storage


def backfill_all_snapshots():
    """Process all simulation data files in order and generate changelog."""
    data_dir = project_root / 'data'
    simulation_dir = data_dir / 'simulation-data'
    
    # Initialize storage
    storage = Storage(data_dir)
    
    # Get all simulation files sorted by date
    csv_files = sorted(simulation_dir.glob('*.csv'))
    
    if not csv_files:
        print("No simulation data files found!")
        return
    
    print(f"Found {len(csv_files)} simulation data files:")
    for f in csv_files:
        print(f"  - {f.name}")
    
    # Clear existing changelog
    print("\nClearing existing changelog...")
    storage.save_changelog([])
    
    # Process each file in order
    previous_df = None
    total_entries = 0
    
    for i, file_path in enumerate(csv_files):
        # Extract date from filename
        process_date = extract_date_from_filename(file_path.name)
        if not process_date:
            # Default to adding days to a base date
            process_date = datetime(2026, 2, 3 + i)
        
        print(f"\nProcessing: {file_path.name}")
        print(f"  Date: {process_date.strftime('%Y-%m-%d')}")
        
        # Load current snapshot
        current_df = load_snapshot(file_path)
        
        # Compare with previous and generate entries
        entries = compare_snapshots(previous_df, current_df, process_date)
        
        print(f"  Entries generated: {len(entries)}")
        print(f"    - campaign-start: {sum(1 for e in entries if e['event_type'] == 'campaign-start')}")
        print(f"    - campaign-end: {sum(1 for e in entries if e['event_type'] == 'campaign-end')}")
        print(f"    - campaign-update: {sum(1 for e in entries if e['event_type'] == 'campaign-update')}")
        
        # Save entries
        if entries:
            storage.append_changelog_entries(entries)
            total_entries += len(entries)
        
        # Current becomes previous for next iteration
        previous_df = current_df
    
    print(f"\n{'='*50}")
    print(f"Backfill complete!")
    print(f"Total entries created: {total_entries}")
    print(f"Unique dates: {storage.get_changelog_dates()}")
    
    # Update master state
    state = storage.load_master_state()
    state['last_processed'] = datetime.now().isoformat()
    state['backfill_completed'] = True
    storage.save_master_state(state)
    
    print("\nMaster state updated.")


if __name__ == '__main__':
    backfill_all_snapshots()
