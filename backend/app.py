"""
Flask application - main entry point.
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
from datetime import datetime, timedelta
import os
import pandas as pd

from backend.services.changelog import compare_snapshots
from backend.services.calendar import (
    classify_campaigns, 
    get_calendar_summary,
    get_unique_providers_by_status,
    filter_campaigns,
    aggregate_by_date,
    aggregate_banners_by_date,
    get_time_series_data
)
from backend.utils.csv_parser import load_snapshot_from_bytes
from backend.utils.storage import get_storage
from backend.config import Config


# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Serve from frontend/dist
app = Flask(
    __name__,
    static_folder=str(PROJECT_ROOT / 'frontend' / 'dist'),
    static_url_path='/static'  # Change static URL path to avoid conflicts
)
CORS(app) # Allow dev server to access API

# Configuration
storage = get_storage()

# ============== Pages ==============

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Don't serve static files for API routes
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Serve static files if they exist
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Otherwise serve index.html for client-side routing
    return send_from_directory(app.static_folder, 'index.html')


# ============== API Endpoints ==============

@app.route('/api/changelog')
def api_changelog():
    """Get changelog data."""
    # Two modes: 
    # 1. Summary/Chart data (last 2 weeks)
    # 2. Detail data (latest run or specific date)
    
    all_entries = storage.load_changelog()
    dates = storage.get_changelog_dates()
    dates.sort(reverse=True)
    latest_date = dates[0] if dates else None
    
    # --- 1. Summary Data (Last 2 Weeks) ---
    today = datetime.now().date()
    two_weeks_ago = (today - timedelta(days=14)).strftime('%Y-%m-%d')
    
    recent_entries = [e for e in all_entries if e.get('date') >= two_weeks_ago]
    
    # Time series for chart
    time_series = aggregate_by_date(recent_entries)
    
    # Calculates stats for latest date vs previous date
    latest_stats = {'campaign-start': 0, 'campaign-update': 0, 'campaign-end': 0}
    prev_stats = {'campaign-start': 0, 'campaign-update': 0, 'campaign-end': 0}
    
    if len(dates) > 0:
        latest_entries = [e for e in all_entries if e.get('date') == dates[0]]
        for e in latest_entries:
            if e.get('event_type') in latest_stats:
                latest_stats[e.get('event_type')] += 1
                
    if len(dates) > 1:
        prev_entries = [e for e in all_entries if e.get('date') == dates[1]]
        for e in prev_entries:
            if e.get('event_type') in prev_stats:
                prev_stats[e.get('event_type')] += 1
                
    summary = {
        'latest_date': dates[0] if dates else None,
        'stats': latest_stats,
        'prev_stats': prev_stats
    }

    # --- 2. Detail Data ---
    detail_date = request.args.get('date') or latest_date
    detail_entries = [e for e in all_entries if e.get('date') == detail_date]
    
    # Group by event type for the table
    grouped = {
        'campaign-start': [],
        'campaign-update': [],
        'campaign-end': []
    }
    
    for entry in detail_entries:
        event_type = entry.get('event_type')
        if event_type in grouped:
            grouped[event_type].append(entry)
    
    return jsonify({
        'summary': summary,
        'time_series': time_series,
        'grouped': grouped,
        'dates': dates,
        'detail_date': detail_date,
        'all_recent_entries': recent_entries  # Raw entries for client-side filtering
    })


@app.route('/api/calendar')
def api_calendar():
    """Get calendar data from the latest snapshot in GCS."""
    
    # Get latest snapshot from GCS (saved during sync)
    try:
        filename, content = storage.get_latest_snapshot()
        print(f"Calendar endpoint: Retrieved snapshot - filename={filename}, content_size={len(content) if content else 0}")
    except Exception as e:
        print(f"Calendar endpoint: Error retrieving snapshot - {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Error retrieving snapshot: {str(e)}',
            'summary': {'live': 0, 'scheduled': 0, 'finished': 0},
            'providers': {'live': 0, 'scheduled': 0, 'finished': 0},
            'campaigns': []
        })
    
    if not filename or not content:
        return jsonify({
            'error': 'No snapshot data available. Run /api/sync to fetch from Google Drive.',
            'summary': {'live': 0, 'scheduled': 0, 'finished': 0},
            'providers': {'live': 0, 'scheduled': 0, 'finished': 0},
            'campaigns': []
        })
    
    df = load_snapshot_from_bytes(content)

    today = datetime.now()
    
    # Apply filters from request
    provider = request.args.get('provider')
    city = request.args.get('city')
    discount_type = request.args.get('discount_type')
    status = request.args.get('status')
    account_manager = request.args.get('account_manager')
    spend_objective = request.args.get('spend_objective')
    bonus_type = request.args.get('bonus_type')
    
    # Apply non-status filters first (for time series)
    base_filtered_df = df.copy()
    if provider:
        base_filtered_df = base_filtered_df[
            base_filtered_df['provider_name'].str.lower().str.contains(provider.lower(), na=False)
        ]
    if city:
        base_filtered_df = base_filtered_df[base_filtered_df['city'].str.lower() == city.lower()]
    if discount_type:
        base_filtered_df = base_filtered_df[base_filtered_df['discount_type'] == discount_type]
    if account_manager:
        base_filtered_df = base_filtered_df[base_filtered_df['account_manager'] == account_manager]
    if spend_objective:
        base_filtered_df = base_filtered_df[base_filtered_df['spend_objective'] == spend_objective]
    if bonus_type:
        base_filtered_df = base_filtered_df[base_filtered_df['bonus_type'] == bonus_type]
    
    # --- 1. Time Series Data (Past 7 + Next 14 days) - AFTER filtering ---
    start_date = today - timedelta(days=7)
    end_date = today + timedelta(days=14)
    time_series = get_time_series_data(base_filtered_df, start_date, end_date)
    
    # --- 2. Current Status ---
    # Classify campaigns based on TODAY
    classified_df = classify_campaigns(base_filtered_df, today)
    
    # Apply status filter if provided
    filtered_df = classified_df
    if status:
        filtered_df = filtered_df[filtered_df['status'] == status]
    
    # Get current summary
    current_summary = get_calendar_summary(classified_df)  # Summary from all statuses
    providers = get_unique_providers_by_status(classified_df)
    
    # Get previous day summary for delta
    yesterday_df = classify_campaigns(base_filtered_df, today - timedelta(days=1))
    prev_summary = get_calendar_summary(yesterday_df)
    
    # Convert to records
    campaigns = filtered_df.to_dict('records')
    
    # Group by status
    grouped = {'live': [], 'scheduled': [], 'finished': []}
    for camp in campaigns:
        s = camp.get('status', 'live')
        if s in grouped:
            grouped[s].append(camp)
    
    return jsonify({
        'summary': current_summary,
        'prev_summary': prev_summary,
        'providers': providers,
        'grouped': grouped,
        'time_series': time_series,
        'filters': {
            'cities': df['city'].dropna().unique().tolist(),
            'discount_types': df['discount_type'].dropna().unique().tolist()
        }
    })


@app.route('/api/banners')
def api_banners():
    """Get banner actions data."""
    # Banners are based on Changelog entries, but presented like Calendar (table focus)
    date = request.args.get('date')
    
    all_entries = storage.load_changelog()
    dates = storage.get_changelog_dates()
    dates.sort(reverse=True)
    
    # Default to latest date if not specified
    target_date = date or (dates[0] if dates else None)
    
    target_entries = [e for e in all_entries if e.get('date') == target_date]
    
    # Filter to only entries with banner actions
    banner_entries = [e for e in target_entries if e.get('banner_action')]
    
    # Group by banner action
    grouped = {
        'banner-start': [],
        'banner-update': [],
        'banner-end': []
    }
    
    for entry in banner_entries:
        action = entry.get('banner_action')
        if action in grouped:
            grouped[action].append(entry)
            
    # Calculate summary for this date
    summary = {
        'start': len(grouped['banner-start']),
        'update': len(grouped['banner-update']),
        'end': len(grouped['banner-end'])
    }
    
    return jsonify({
        'summary': summary,
        'grouped': grouped,
        'dates': dates,
        'current_date': target_date
    })


@app.route('/api/admin/state')
def api_admin_state():
    """Get current system state for admin page."""
    state = storage.load_master_state()
    return jsonify(state)


@app.route('/api/sync', methods=['POST'])
@app.route('/api/admin/data-pull/trigger', methods=['POST'])  # Cloud Scheduler endpoint
def api_sync():
    """
    Sync snapshots from Google Drive and process changes.
    Can be triggered by Cloud Scheduler.
    
    Process:
    1. Download all snapshots from Google Drive
    2. Sort by modification time (newest first)
    3. Compare the 2 most recent
    4. Append changelog entries to GCS
    5. Update master state in GCS
    
    Note: Raw snapshots are NOT stored in GCS, only processed results.
    """
    try:
        if not Config.DRIVE_FOLDER_ID:
            return jsonify({'error': 'DRIVE_FOLDER_ID not configured'}), 400
        
        # 1. Download all snapshots from Drive
        from backend.services.drive_client import DriveClient
        drive_client = DriveClient()
        
        files = drive_client.list_files()
        
        if len(files) < 2:
            return jsonify({'error': f'Need at least 2 files in Drive to compare. Found: {len(files)}'}), 400
        
        # 2. Download all files and extract their ingestion timestamps
        print(f"Downloading {len(files)} files from Drive to determine recency...")
        file_data = []
        for f in files:
            content = drive_client.download_file(f['id'])
            df = load_snapshot_from_bytes(content)
            
            # Get max Last Ingested Ts Time from the file (column name not normalized)
            max_ingested = pd.to_datetime(df['Last Ingested Ts Time']).max()
            
            file_data.append({
                'drive_file': f,
                'content': content,
                'df': df,
                'max_ingested': max_ingested
            })
            print(f"  {f['name']}: max ingested = {max_ingested}")
        
        # 3. Sort by max_ingested (newest first)
        file_data.sort(key=lambda x: x['max_ingested'], reverse=True)
        
        if len(file_data) < 2:
            return jsonify({'error': f'Need at least 2 files in Drive to compare. Found: {len(file_data)}'}), 400
        
        # 4. Get the 2 most recent based on ingestion time
        current = file_data[0]
        previous = file_data[1]
        
        print(f"\nComparing files (by ingestion time):")
        print(f"  Current:  {current['drive_file']['name']} (ingested: {current['max_ingested']})")
        print(f"  Previous: {previous['drive_file']['name']} (ingested: {previous['max_ingested']})")
        
        # 5. Use the current file's max ingestion time as the process date
        process_date = current['max_ingested'].to_pydatetime()
        date_str = process_date.strftime('%Y-%m-%d')
        
        # 6. Check if we already have entries for this date
        existing_dates = storage.get_changelog_dates()
        if date_str in existing_dates:
            # Even if changelog exists, ensure snapshot is saved for calendar endpoint
            print(f"Changelog for {date_str} already exists, but ensuring snapshot is saved...")
            storage.save_snapshot(current['drive_file']['name'], current['content'])
            print(f"✅ Snapshot saved to GCS")
            
            return jsonify({
                'success': True,
                'skipped': True,
                'message': f'Changelog entries for {date_str} already exist',
                'files_in_drive': len(files),
                'current_file': current['drive_file']['name'],
                'current_ingested': str(current['max_ingested']),
                'previous_file': previous['drive_file']['name'],
                'previous_ingested': str(previous['max_ingested']),
                'entries_created': 0,
                'date': date_str
            })
        
        # 7. Compare and generate changelog
        entries = compare_snapshots(previous['df'], current['df'], process_date)
        
        # 8. Save entries to GCS
        storage.append_changelog_entries(entries)
        
        # 9. Save the current snapshot to GCS for calendar endpoint
        print(f"Saving snapshot to GCS: {current['drive_file']['name']}, size={len(current['content'])} bytes")
        storage.save_snapshot(current['drive_file']['name'], current['content'])
        print(f"✅ Snapshot saved successfully")
        
        # 10. Cleanup old snapshots (keep only 10 most recent)
        deleted_count = storage.cleanup_old_snapshots(keep_count=10)
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} old snapshot(s) from GCS")
        
        # 11. Update master state in GCS
        state = storage.load_master_state()
        state['last_processed'] = datetime.now().isoformat()
        state['last_current_file'] = current['drive_file']['name']
        state['last_current_ingested'] = str(current['max_ingested'])
        state['last_previous_file'] = previous['drive_file']['name']
        state['last_previous_ingested'] = str(previous['max_ingested'])
        storage.save_master_state(state)
        
        return jsonify({
            'success': True,
            'files_in_drive': len(files),
            'current_file': current['drive_file']['name'],
            'current_ingested': str(current['max_ingested']),
            'previous_file': previous['drive_file']['name'],
            'previous_ingested': str(previous['max_ingested']),
            'entries_created': len(entries),
            'date': date_str
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
