# Deployment Setup Guide

This project requires certain Google Cloud resources (Service Account, GCS Bucket, enabled APIs) to function correctly in production.

## Automated Setup

Run the helper script to provision all required resources:

```bash
./scripts/setup_gcloud_resources.sh
```

This script will:
1.  Enable `drive.googleapis.com` and `storage.googleapis.com` APIs.
2.  Create a Service Account: `campaign-changelog-sa@industrial-gist-470307-k4.iam.gserviceaccount.com`.
3.  Create a GCS Bucket: `gs://campaign-changelog-data`.
4.  Grant the Service Account `objectAdmin` access to the bucket.

## Manual Steps (Required)

After running the script, you **must manually share the Google Drive folder** with the created Service Account.

1.  Copy the Service Account email created by the script (e.g., `campaign-changelog-sa@industrial-gist-470307-k4.iam.gserviceaccount.com`).
2.  Go to your Google Drive folder.
3.  Click **Share**.
4.  Paste the email address and give it **Viewer** permission.
5.  Click **Send**.

## Verification

To verify the setup, you can check:

-   **Bucket**: `gsutil ls gs://campaign-changelog-data`
-   **Service Account**: `gcloud iam service-accounts list`

## Local Development

To run the application locally with full integration (Google Drive access), your local credentials must have the specific `drive.readonly` scope enabled.

Run this command to authenticate:

```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/cloud-platform
```

Once authenticated, you can verify the integration:
```bash
python3 scripts/test_local_integration.py
```
