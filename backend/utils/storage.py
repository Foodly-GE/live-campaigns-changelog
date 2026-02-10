"""
File I/O helpers for state management.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime


class Storage:
    """Handles reading and writing state files."""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.state_dir = data_dir / 'state'
        self.history_dir = data_dir / 'history'
        
        # Ensure directories exist
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.history_dir.mkdir(parents=True, exist_ok=True)
    
    @property
    def master_state_path(self) -> Path:
        return self.state_dir / 'master_state.json'
    
    @property
    def changelog_log_path(self) -> Path:
        return self.history_dir / 'changelog_log.json'
    
    def load_master_state(self) -> Dict[str, Any]:
        """Load the current master state."""
        if not self.master_state_path.exists():
            return {
                'last_processed': None,
                'campaigns': {}
            }
        
        with open(self.master_state_path, 'r') as f:
            return json.load(f)
    
    def save_master_state(self, state: Dict[str, Any]) -> None:
        """Save the master state."""
        with open(self.master_state_path, 'w') as f:
            json.dump(state, f, indent=2, default=str)
    
    def load_changelog(self) -> List[Dict[str, Any]]:
        """Load all changelog entries."""
        if not self.changelog_log_path.exists():
            return []
        
        with open(self.changelog_log_path, 'r') as f:
            return json.load(f)
    
    def save_changelog(self, entries: List[Dict[str, Any]]) -> None:
        """Save changelog entries."""
        with open(self.changelog_log_path, 'w') as f:
            json.dump(entries, f, indent=2, default=str)
    
    def append_changelog_entries(self, new_entries: List[Dict[str, Any]]) -> None:
        """Append new entries to the changelog."""
        existing = self.load_changelog()
        existing.extend(new_entries)
        self.save_changelog(existing)
    
    def get_changelog_by_date(self, date: str) -> List[Dict[str, Any]]:
        """Get changelog entries for a specific date."""
        all_entries = self.load_changelog()
        return [e for e in all_entries if e.get('date') == date]
    
    def get_changelog_dates(self) -> List[str]:
        """Get all unique dates in the changelog."""
        all_entries = self.load_changelog()
        dates = sorted(set(e.get('date') for e in all_entries if e.get('date')))
        return dates

    def save_snapshot(self, filename: str, content: bytes) -> None:
        """Save a snapshot CSV file locally."""
        snapshots_dir = self.data_dir / 'snapshots'
        snapshots_dir.mkdir(parents=True, exist_ok=True)
        (snapshots_dir / filename).write_bytes(content)

    def list_snapshots(self) -> List[str]:
        """List snapshot filenames locally."""
        snapshots_dir = self.data_dir / 'snapshots'
        if not snapshots_dir.exists():
            return []
        return [p.name for p in snapshots_dir.glob('*.csv')]

    def get_snapshot_content(self, filename: str) -> bytes:
        """Get content of a snapshot file."""
        snapshots_dir = self.data_dir / 'snapshots'
        return (snapshots_dir / filename).read_bytes()


def get_storage(config=None):
    """Factory method to get the appropriate storage backend."""
    # Avoid circular imports
    from backend.config import Config
    
    if Config.STORAGE_BACKEND == 'gcs':
        from backend.utils.gcs_storage import GCSStorage
        return GCSStorage(Config.GCS_BUCKET, Config.GCS_PROJECT)
    
    raise ValueError("Only GCS storage backend is supported. Set STORAGE_BACKEND=gcs")

