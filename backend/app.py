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
from backend.utils.csv_parser import load_snapshot, get_latest_snapshot
from backend.utils.storage import Storage


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
DATA_DIR = Path(os.environ.get('DATA_DIR', PROJECT_ROOT / 'data'))
storage = Storage(DATA_DIR)

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
        'detail_date': detail_date
    })


@app.route('/api/calendar')
def api_calendar():
    """Get calendar data."""
    # Load latest snapshot
    snapshots_dir = DATA_DIR / 'snapshots'
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
    
    # --- 1. Time Series Data (Past 7 + Next 14 days) ---
    start_date = today - timedelta(days=7)
    end_date = today + timedelta(days=14)
    time_series = get_time_series_data(df, start_date, end_date)
    
    # --- 2. Current Status ---
    # Classify campaigns based on TODAY
    df = classify_campaigns(df, today)
    
    # Apply filters
    provider = request.args.get('provider')
    city = request.args.get('city')
    discount_type = request.args.get('discount_type')
    status = request.args.get('status')
    
    filtered_df = filter_campaigns(
        df,
        provider_name=provider,
        city=city,
        discount_type=discount_type,
        status=status
    )
    
    # Get current summary
    current_summary = get_calendar_summary(filtered_df)
    providers = get_unique_providers_by_status(filtered_df)
    
    # Get previous day summary for delta
    yesterday_df = classify_campaigns(df, today - timedelta(days=1))
    # Apply same filters to yesterday's view
    yesterday_filtered = filter_campaigns(
        yesterday_df,
        provider_name=provider,
        city=city,
        discount_type=discount_type,
        status=status
    )
    prev_summary = get_calendar_summary(yesterday_filtered)
    
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


@app.route('/api/process', methods=['POST'])
def api_process():
    """Process a new snapshot file."""
    # This would be called by Cloud Scheduler or manually
    snapshots_dir = DATA_DIR / 'snapshots'
    
    # Get current and previous snapshots
    csv_files = sorted(snapshots_dir.glob('*.csv'))
    
    if not csv_files:
        return jsonify({'error': 'No snapshot files found'}), 400
    
    current_file = csv_files[-1]
    previous_file = csv_files[-2] if len(csv_files) > 1 else None
    
    # Load dataframes
    current_df = load_snapshot(current_file)
    previous_df = load_snapshot(previous_file) if previous_file else None
    
    # Compare and generate changelog
    process_date = datetime.now()
    entries = compare_snapshots(previous_df, current_df, process_date)
    
    # Save entries
    storage.append_changelog_entries(entries)
    
    # Update master state
    state = storage.load_master_state()
    state['last_processed'] = process_date.isoformat()
    storage.save_master_state(state)
    
    return jsonify({
        'success': True,
        'entries_created': len(entries),
        'date': process_date.strftime('%Y-%m-%d')
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
