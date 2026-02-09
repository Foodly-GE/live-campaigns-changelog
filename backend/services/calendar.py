"""
Calendar feature - campaign status classification.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd

from backend.services.hashing import generate_campaign_hash


def classify_campaign(
    campaign_start: Optional[datetime],
    campaign_end: Optional[datetime],
    reference_date: datetime
) -> str:
    """
    Classify a campaign as live, scheduled, or finished.
    
    Args:
        campaign_start: Campaign start datetime
        campaign_end: Campaign end datetime
        reference_date: Date to compare against
        
    Returns:
        'live', 'scheduled', or 'finished'
    """
    ref_date = reference_date.date() if isinstance(reference_date, datetime) else reference_date
    
    # Parse dates if strings
    if isinstance(campaign_start, str):
        try:
            campaign_start = datetime.fromisoformat(campaign_start.replace(' ', 'T'))
        except:
            campaign_start = None
    
    if isinstance(campaign_end, str):
        try:
            campaign_end = datetime.fromisoformat(campaign_end.replace(' ', 'T'))
        except:
            campaign_end = None
    
    start_date = campaign_start.date() if campaign_start else None
    end_date = campaign_end.date() if campaign_end else None
    
    # Classification logic
    if start_date and start_date > ref_date:
        return 'scheduled'
    
    if end_date and end_date < ref_date:
        return 'finished'
    
    return 'live'


def classify_campaigns(
    df: pd.DataFrame,
    reference_date: datetime
) -> pd.DataFrame:
    """
    Add campaign status classification to dataframe.
    
    Args:
        df: DataFrame with campaign data
        reference_date: Date to classify against
        
    Returns:
        DataFrame with 'status' column added
    """
    df = df.copy()
    
    # Add campaign hash if not present
    if 'campaign_hash' not in df.columns:
        df['campaign_hash'] = df.apply(
            lambda row: generate_campaign_hash(
                row['provider_id'],
                row['discount_type'],
                row['bonus_percentage'],
                row['spend_objective']
            ),
            axis=1
        )
    
    # Classify each campaign
    df['status'] = df.apply(
        lambda row: classify_campaign(
            row.get('campaign_start'),
            row.get('campaign_end'),
            reference_date
        ),
        axis=1
    )
    
    return df


def get_calendar_summary(df: pd.DataFrame) -> Dict[str, int]:
    """
    Get counts of campaigns by status.
    
    Args:
        df: DataFrame with 'status' column
        
    Returns:
        Dict with counts: {'live': N, 'scheduled': N, 'finished': N}
    """
    counts = df['status'].value_counts().to_dict()
    
    return {
        'live': counts.get('live', 0),
        'scheduled': counts.get('scheduled', 0),
        'finished': counts.get('finished', 0)
    }


def get_unique_providers_by_status(df: pd.DataFrame) -> Dict[str, int]:
    """
    Get count of unique providers by campaign status.
    
    Args:
        df: DataFrame with 'status' and 'provider_id' columns
        
    Returns:
        Dict with unique provider counts per status
    """
    result = {}
    
    for status in ['live', 'scheduled', 'finished']:
        status_df = df[df['status'] == status]
        result[status] = status_df['provider_id'].nunique()
    
    return result


def filter_campaigns(
    df: pd.DataFrame,
    provider_id: Optional[str] = None,
    provider_name: Optional[str] = None,
    city: Optional[str] = None,
    discount_type: Optional[str] = None,
    status: Optional[str] = None
) -> pd.DataFrame:
    """
    Filter campaigns by various criteria.
    
    Args:
        df: DataFrame with campaign data
        provider_id: Filter by provider ID
        provider_name: Filter by provider name (partial match)
        city: Filter by city
        discount_type: Filter by discount type
        status: Filter by status (live/scheduled/finished)
        
    Returns:
        Filtered DataFrame
    """
    filtered = df.copy()
    
    if provider_id:
        filtered = filtered[filtered['provider_id'].astype(str) == str(provider_id)]
    
    if provider_name:
        filtered = filtered[
            filtered['provider_name'].str.lower().str.contains(provider_name.lower(), na=False)
        ]
    
    if city:
        filtered = filtered[filtered['city'].str.lower() == city.lower()]
    
    if discount_type:
        filtered = filtered[filtered['discount_type'] == discount_type]
    
    if status:
        filtered = filtered[filtered['status'] == status]
    
    return filtered


def aggregate_by_date(
    changelog_entries: List[Dict[str, Any]]
) -> Dict[str, Dict[str, int]]:
    """
    Aggregate changelog entries by date for time series.
    
    Args:
        changelog_entries: List of changelog entries
        
    Returns:
        Dict of date -> {event_type: count}
    """
    from collections import defaultdict
    
    result = defaultdict(lambda: {'campaign-start': 0, 'campaign-update': 0, 'campaign-end': 0})
    
    for entry in changelog_entries:
        date = entry.get('date')
        event_type = entry.get('event_type')
        
        if date and event_type:
            result[date][event_type] += 1
    
    return dict(result)


def aggregate_banners_by_date(
    changelog_entries: List[Dict[str, Any]]
) -> Dict[str, Dict[str, int]]:
    """
    Aggregate banner actions by date for time series.
    
    Args:
        changelog_entries: List of changelog entries
        
    Returns:
        Dict of date -> {banner_action: count}
    """
    from collections import defaultdict
    
    result = defaultdict(lambda: {'banner-start': 0, 'banner-update': 0, 'banner-end': 0})
    
    for entry in changelog_entries:
        date = entry.get('date')
        banner_action = entry.get('banner_action')
        
        if date and banner_action:
            result[date][banner_action] += 1
    
    return dict(result)


def get_time_series_data(
    df: pd.DataFrame,
    start_date: datetime,
    end_date: datetime
) -> Dict[str, Dict[str, int]]:
    """
    Calculate campaign status counts for each date in a range.
    Reclassifies all campaigns against each date to get accurate snapshot totals.
    
    Args:
        df: DataFrame with campaign data
        start_date: Start of date range
        end_date: End of date range
        
    Returns:
        Dict of date -> {live: N, finished: N, scheduled: N}
    """
    result = {}
    current = start_date
    
    # Pre-calculate date objects for efficiency
    campaigns = df.to_dict('records')
    for campaign in campaigns:
        # Convert strings to date objects if needed
        if isinstance(campaign.get('campaign_start'), str):
            try:
                campaign['start_dt'] = datetime.fromisoformat(campaign['campaign_start'].replace(' ', 'T')).date()
            except:
                campaign['start_dt'] = None
        else:
            campaign['start_dt'] = campaign.get('campaign_start').date() if campaign.get('campaign_start') else None
            
        if isinstance(campaign.get('campaign_end'), str):
            try:
                campaign['end_dt'] = datetime.fromisoformat(campaign['campaign_end'].replace(' ', 'T')).date()
            except:
                campaign['end_dt'] = None
        else:
            campaign['end_dt'] = campaign.get('campaign_end').date() if campaign.get('campaign_end') else None

    while current <= end_date:
        date_str = current.strftime('%Y-%m-%d')
        ref_date = current.date()
        
        counts = {'live': 0, 'finished': 0, 'scheduled': 0}
        
        for campaign in campaigns:
            start = campaign.get('start_dt')
            end = campaign.get('end_dt')
            
            status = 'live'
            if start and start > ref_date:
                status = 'scheduled'
            elif end and end < ref_date:
                status = 'finished'
            
            counts[status] += 1
            
        result[date_str] = counts
        current = current + pd.Timedelta(days=1)
        
    return result
