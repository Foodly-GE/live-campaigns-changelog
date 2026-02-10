import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Config:
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
    
    # Storage
    STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'local')  # 'local' or 'gcs'
    GCS_PROJECT = os.getenv('GCS_PROJECT', 'industrial-gist-470307-k4')
    GCS_BUCKET = os.getenv('GCS_BUCKET', 'campaign-changelog-data')
    
    # Google Drive
    DRIVE_FOLDER_ID = os.getenv('DRIVE_FOLDER_ID')
    SNAPSHOT_FILE_SUBSTRING = os.getenv('SNAPSHOT_FILE_SUBSTRING', 'smart-promos-status-changelog')
    
    # Credentials (optional, for local dev)
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
