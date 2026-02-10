import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from google.cloud import storage as gcs
from backend.utils.storage import Storage # Inherit/interface compatibility
from pathlib import Path

class GCSStorage:
    """Storage backend using Google Cloud Storage."""
    
    def __init__(self, bucket_name: str, project_id: str):
        self.client = gcs.Client(project=project_id)
        self.bucket = self.client.bucket(bucket_name)
        
    def _read_json(self, blob_name: str) -> Any:
        blob = self.bucket.blob(blob_name)
        if not blob.exists():
            return None
        return json.loads(blob.download_as_text())

    def _write_json(self, blob_name: str, data: Any) -> None:
        blob = self.bucket.blob(blob_name)
        blob.upload_from_string(json.dumps(data, indent=2, default=str))

    def load_master_state(self) -> Dict[str, Any]:
        data = self._read_json('state/master_state.json')
        if data is None:
            return {
                'last_processed': None,
                'campaigns': {}
            }
        return data

    def save_master_state(self, state: Dict[str, Any]) -> None:
        self._write_json('state/master_state.json', state)

    def load_changelog(self) -> List[Dict[str, Any]]:
        data = self._read_json('history/changelog_log.json')
        return data if data is not None else []

    def save_changelog(self, entries: List[Dict[str, Any]]) -> None:
        self._write_json('history/changelog_log.json', entries)

    def append_changelog_entries(self, new_entries: List[Dict[str, Any]]) -> None:
        existing = self.load_changelog()
        existing.extend(new_entries)
        self.save_changelog(existing)

    def get_changelog_by_date(self, date: str) -> List[Dict[str, Any]]:
        all_entries = self.load_changelog()
        return [e for e in all_entries if e.get('date') == date]

    def get_changelog_dates(self) -> List[str]:
        all_entries = self.load_changelog()
        dates = sorted(set(e.get('date') for e in all_entries if e.get('date')))
        return dates

    def save_snapshot(self, filename: str, content: bytes) -> None:
        """Save a snapshot CSV file to GCS."""
        blob = self.bucket.blob(f'snapshots/{filename}')
        blob.upload_from_string(content)

    def list_snapshots(self) -> List[str]:
        """List snapshot filenames in GCS."""
        blobs = self.bucket.list_blobs(prefix='snapshots/')
        return [blob.name.replace('snapshots/', '') for blob in blobs if blob.name.endswith('.csv')]

    def get_snapshot_content(self, filename: str) -> bytes:
        """Get content of a snapshot file from GCS."""
        blob = self.bucket.blob(f'snapshots/{filename}')
        if not blob.exists():
            return None
        return blob.download_as_bytes()
    
    def get_latest_snapshot(self) -> tuple[Optional[str], Optional[bytes]]:
        """Get the most recently saved snapshot from GCS."""
        blobs = list(self.bucket.list_blobs(prefix='snapshots/'))
        csv_blobs = [b for b in blobs if b.name.endswith('.csv')]
        
        if not csv_blobs:
            return None, None
        
        # Sort by updated time, most recent first
        csv_blobs.sort(key=lambda b: b.updated, reverse=True)
        latest = csv_blobs[0]
        
        filename = latest.name.replace('snapshots/', '')
        content = latest.download_as_bytes()
        
        return filename, content
    
    def cleanup_old_snapshots(self, keep_count: int = 10) -> int:
        """
        Delete old snapshots, keeping only the most recent ones.
        
        Args:
            keep_count: Number of most recent snapshots to keep
            
        Returns:
            Number of snapshots deleted
        """
        blobs = list(self.bucket.list_blobs(prefix='snapshots/'))
        csv_blobs = [b for b in blobs if b.name.endswith('.csv')]
        
        if len(csv_blobs) <= keep_count:
            return 0
        
        # Sort by updated time, most recent first
        csv_blobs.sort(key=lambda b: b.updated, reverse=True)
        
        # Delete old ones
        to_delete = csv_blobs[keep_count:]
        deleted_count = 0
        
        for blob in to_delete:
            blob.delete()
            deleted_count += 1
            print(f"Deleted old snapshot: {blob.name}")
        
        return deleted_count

