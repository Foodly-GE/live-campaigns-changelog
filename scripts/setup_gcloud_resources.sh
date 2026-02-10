#!/bin/bash
# scripts/setup_gcloud_resources.sh

# Exit on error
set -e

PROJECT_ID="industrial-gist-470307-k4"
REGION="europe-west1"
BUCKET_NAME="campaign-changelog-data"
SA_NAME="campaign-changelog-sa"

echo "==================================================="
echo "Starting Google Cloud Resource Setup"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Bucket Name: $BUCKET_NAME"
echo "Service Account: $SA_NAME"
echo "==================================================="

# 1. Enable required APIs
echo "Enabling APIs..."
gcloud services enable drive.googleapis.com storage.googleapis.com --project="$PROJECT_ID"
echo "APIs enabled."

# 2. Create Service Account
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" > /dev/null 2>&1; then
    echo "Service Account $SA_NAME already exists."
else
    echo "Creating Service Account $SA_NAME..."
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="Campaign Changelog Service Account" \
        --project="$PROJECT_ID"
    echo "Service Account created: $SA_EMAIL"
fi

# 3. Create GCS Bucket
if gsutil ls -p "$PROJECT_ID" "gs://$BUCKET_NAME" > /dev/null 2>&1; then
    echo "Bucket gs://$BUCKET_NAME already exists."
else
    echo "Creating bucket gs://$BUCKET_NAME in $REGION..."
    gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$BUCKET_NAME"
    echo "Bucket created."
fi

# 4. Grant IAM Roles to Service Account on Bucket
echo "Granting roles/storage.objectAdmin to $SA_EMAIL on gs://$BUCKET_NAME..."
gsutil iam ch "serviceAccount:$SA_EMAIL:objectAdmin" "gs://$BUCKET_NAME"
echo "Access granted."

# 5. Output Summary & Manual Steps
echo ""
echo "==================================================="
echo "SETUP COMPLETE!"
echo "==================================================="
echo "Service Account Email: $SA_EMAIL"
echo "GCS Bucket: gs://$BUCKET_NAME"
echo ""
echo "!!! IMPORTANT MANUAL STEPS !!!"
echo "1. Share the Google Drive folder with the Service Account email above."
echo "   (Folder ID: 1U4A3XTHb7j5lJeJvTmMudBmSiHIRT08x)"
echo "   Use the 'Share' button in Google Drive web UI and paste: $SA_EMAIL"
echo "==================================================="
