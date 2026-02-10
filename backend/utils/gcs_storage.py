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

