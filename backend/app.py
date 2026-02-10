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
from backend.utils.csv_parser import load_snapshot, load_snapshot_from_bytes, get_latest_snapshot
from backend.utils.storage import get_storage
from backend.config import Config


# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Serve from frontend/dist
app = Flask(
    __name__,
    static_folder=str(PROJECT_ROOT / 'frontend' / 'dist'),
    static_url_path=''
)
CORS(app) # Allow dev server to access API

# Configuration
DATA_DIR = Path(Config.DATA_DIR)
storage = get_storage()

# ============== Pages ==============

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
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
    """Get calendar data."""
    # Load latest snapshot
    # Support both local and GCS
    df = None
    
    if Config.STORAGE_BACKEND == 'gcs':
        # GCS mode
        snapshots = storage.list_snapshots()
        if not snapshots:
             return jsonify({
                'error': 'No snapshot data available',
                'summary': {'live': 0, 'scheduled': 0, 'finished': 0},
                'providers': {'live': 0, 'scheduled': 0, 'finished': 0},
                'campaigns': []
            })
        
        snapshots.sort(reverse=True) # Assumes YYYY-MM-DD or similar sortable names
        latest_file = snapshots[0]
        content = storage.get_snapshot_content(latest_file)
        df = load_snapshot_from_bytes(content)
        
    else:
        # Local mode    
        snapshots_dir = DATA_DIR / 'snapshots'
        # ensure dir exists
        snapshots_dir.mkdir(parents=True, exist_ok=True)
        
        latest_file = get_latest_snapshot(snapshots_dir)
        
        if not latest_file:
            return jsonify({
                'error': 'No snapshot data available',
                'summary': {'live': 0, 'scheduled': 0, 'finished': 0},
                'providers': {'live': 0, 'scheduled': 0, 'finished': 0},
                'campaigns': []
            })
        
        df = load_snapshot(latest_file)

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


@app.route('/api/sync', methods=['POST'])
def api_sync():
    """
    Sync snapshots from Google Drive and process changes.
    Can be triggered by Cloud Scheduler.
    """
    try:
        # 1. Download latest from Drive (if configured)
        drive_file_name = None
        drive_content = None
        
        if Config.DRIVE_FOLDER_ID:
            from backend.services.drive_client import DriveClient
            drive_client = DriveClient()
            drive_file_name, drive_content = drive_client.get_latest_snapshot()
            
            if drive_file_name and drive_content:
                # Save to storage (GCS or local)
                storage.save_snapshot(drive_file_name, drive_content)
                print(f"Downloaded and saved: {drive_file_name}")
        
        # 2. Get 2 most recent snapshots from storage to compare
        snapshots = storage.list_snapshots()
        snapshots.sort(reverse=True)
        
        if len(snapshots) < 1:
            return jsonify({'error': 'No snapshots found available for processing'}), 400
            
        current_name = snapshots[0]
        # Only compare if we have a previous one
        previous_name = snapshots[1] if len(snapshots) > 1 else None
        
        # Load dataframes
        current_bytes = storage.get_snapshot_content(current_name)
        current_df = load_snapshot_from_bytes(current_bytes)
        
        previous_df = None
        if previous_name:
            prev_bytes = storage.get_snapshot_content(previous_name)
            previous_df = load_snapshot_from_bytes(prev_bytes)
            
        # 3. Compare and generate changelog
        process_date = datetime.now()
        entries = compare_snapshots(previous_df, current_df, process_date)
        
        # 4. Save entries
        storage.append_changelog_entries(entries)
        
        # 5. Update master state
        state = storage.load_master_state()
        state['last_processed'] = process_date.isoformat()
        storage.save_master_state(state)
        
        return jsonify({
            'success': True,
            'downloaded_file': drive_file_name,
            'processed_file': current_name,
            'compared_against': previous_name,
            'entries_created': len(entries),
            'date': process_date.strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
