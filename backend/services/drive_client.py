import io
import os
from typing import List, Tuple, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from backend.config import Config

class DriveClient:
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    
    def __init__(self):
        # Use Application Default Credentials (ADC)
        # This works for:
        # 1. Local dev with 'gcloud auth application-default login'
        # 2. Cloud Run with assigned Service Account
        import google.auth
        self.credentials, _ = google.auth.default(scopes=self.SCOPES)
            
        self.service = build('drive', 'v3', credentials=self.credentials)
        self.folder_id = Config.DRIVE_FOLDER_ID
        self.file_substring = Config.SNAPSHOT_FILE_SUBSTRING

    def list_files(self) -> List[dict]:
        """List all CSV files in the watched folder that match the substring."""
        if not self.folder_id:
            print("Warning: DRIVE_FOLDER_ID not set")
            return []
            
        query = f"'{self.folder_id}' in parents and mimeType='text/csv' and name contains '{self.file_substring}' and trashed=false"
        results = self.service.files().list(
            q=query,
            fields="files(id, name, modifiedTime)",
            orderBy="modifiedTime desc",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        return results.get('files', [])

    def download_file(self, file_id: str) -> bytes:
        """Download file content as bytes."""
        request = self.service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buffer.getvalue()

    def get_latest_snapshot(self) -> Tuple[Optional[str], Optional[bytes]]:
        """Get the most recent snapshot file."""
        files = self.list_files()
        if not files:
            return None, None
        
        # Files are already sorted by modifiedTime desc from API
        latest = files[0]
        content = self.download_file(latest['id'])
        return latest['name'], content
    
    def get_all_snapshots(self) -> List[Tuple[str, bytes]]:
        """Get all snapshot files sorted by name (which usually contains date)."""
        files = self.list_files()
        if not files:
            return []
            
        # Sort by name to ensure chronological order if names contain dates
        files.sort(key=lambda x: x['name'])
        
        results = []
        for file in files:
            content = self.download_file(file['id'])
            results.append((file['name'], content))
            
        return results
