import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.config import Config
from backend.services.drive_client import DriveClient
from backend.utils.storage import get_storage
from backend.utils.csv_parser import load_snapshot_from_bytes
from backend.services.changelog import compare_snapshots
from datetime import datetime

def test_integration():
    print("--- Starting Local Integration Test ---")
    
    # 1. Override Config to force GCS storage and ensure Drive substring is correct
    # We use the values from the environment or .env, but ensure backend matches
    print(f"Environment: {Config.ENVIRONMENT}")
    print(f"Storage Backend (Config): {Config.STORAGE_BACKEND}")
    print(f"GCS Bucket: {Config.GCS_BUCKET}")
    print(f"Drive Folder ID: {Config.DRIVE_FOLDER_ID}")
    
    # Force GCS for this test if it's set to local in .env
    # os.environ['STORAGE_BACKEND'] = 'gcs' 
    # Config.STORAGE_BACKEND = 'gcs'
    # Actually, let's respect the .env file. If user wants to test GCS locally, they should change .env or we expect it to fail if not set up.
    # But for a "integration test", usually we want to test the *Production* path.
    # Let's force GCS for the Storage initialization to verify GCS access.
    
    print("\n[Step 1] Initializing Clients...")
    try:
        drive_client = DriveClient()
        print("✅ DriveClient initialized (using ADC)")
    except Exception as e:
        print(f"❌ Failed to initialize DriveClient: {e}")
        return

    try:
        # Force GCS storage for testing
        from backend.utils.gcs_storage import GCSStorage
        storage = GCSStorage(Config.GCS_BUCKET, Config.GCS_PROJECT)
        print(f"✅ GCSStorage initialized (Bucket: {Config.GCS_BUCKET})")
    except Exception as e:
        print(f"❌ Failed to initialize GCSStorage: {e}")
        return

    print("\n[Step 2] Testing Google Drive Access...")
    try:
        print(f"Listing files in folder {Config.DRIVE_FOLDER_ID} matching substring '{Config.SNAPSHOT_FILE_SUBSTRING}'...")
        files = drive_client.list_files()
        
        if not files:
            print("⚠️ No matching files found in Drive folder.")
            print(f"Filter used: mimeType='text/csv' and name contains '{Config.SNAPSHOT_FILE_SUBSTRING}'")
            
            # Debug: List ALL files in folder to help user see what's there
            print("\n🔍 Debug: Listing first 5 files in the folder regardless of name:")
            try:
                # Create a raw query for just the folder
                query = f"'{Config.DRIVE_FOLDER_ID}' in parents and trashed=false"
                all_files = drive_client.service.files().list(
                    q=query, pageSize=5, fields="files(id, name, mimeType)",
                    supportsAllDrives=True, includeItemsFromAllDrives=True
                ).execute().get('files', [])
                
                if not all_files:
                    print("   (Folder appears empty or you don't have access)")
                for f in all_files:
                     print(f"   - {f['name']} (Mime: {f.get('mimeType')})")
            except Exception as debug_err:
                print(f"   (Failed to list debug files: {debug_err})")
                
        else:
            print(f"✅ Found {len(files)} matching files.")
            for f in files[:3]:
                print(f"   - {f['name']} ({f['id']})")
            
            # Download the latest
            latest_name, latest_content = drive_client.get_latest_snapshot()
            if latest_name:
                print(f"✅ Downloaded latest file: {latest_name} ({len(latest_content)} bytes)")
                
                # Validate CSV
                try:
                    df = load_snapshot_from_bytes(latest_content)
                    print(f"✅ Parsed CSV: {len(df)} rows found.")
                    
                    # Write to GCS
                    print("\n[Step 3] Testing GCS Write Access...")
                    try:
                        storage.save_snapshot(latest_name, latest_content)
                         # Also try to read it back to confirm
                        print(f"✅ Saved snapshot to gs://{Config.GCS_BUCKET}/snapshots/{latest_name}")
                    except Exception as e:
                        print(f"❌ Failed to write to GCS: {e}")
                        if "403" in str(e):
                             print("   (Permission denied. usage: check IAM roles for your user or SA)")
                except Exception as e:
                    print(f"❌ Failed to parse/process CSV content: {e}")
            
    except Exception as e:
        print(f"❌ Drive Access/Download failed: {e}")
        msg = str(e)
        if "invalid_grant" in msg or "invalid_scope" in msg or "401" in msg or "RefreshError" in msg:
             print("\n🛑 AUTHENTICATION REQUIRED")
             print("Please run the following command to authenticate locally with Drive access:")
             print("  gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/cloud-platform")

    print("\n[Step 4] Testing GCS List/Read Access...")
    try:
        snapshots = storage.list_snapshots()
        print(f"✅ GCS Snapshots found: {len(snapshots)}")
        if snapshots:
             print(f"   Latest: {snapshots[-1]}")
    except Exception as e:
        print(f"❌ Failed to list GCS files: {e}")

    print("\n--- Test Complete ---")

if __name__ == "__main__":
    test_integration()
