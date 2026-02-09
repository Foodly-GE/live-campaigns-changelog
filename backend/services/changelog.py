"""
Changelog diff detection logic.
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import pandas as pd

from backend.services.hashing import generate_campaign_hash


# Fields that trigger campaign-update event when changed
UPDATE_FIELDS = [
    'min_basket_size',
    'campaign_id', 
    'cost_share_percentage',
    'bonus_max_value',
    'campaign_start',
    'campaign_end'
]

# Fields that trigger banner-update (subset of UPDATE_FIELDS)
BANNER_UPDATE_FIELDS = [
    'min_basket_size',
    'campaign_id',
    'campaign_end'
]


def add_campaign_hash(df: pd.DataFrame) -> pd.DataFrame:
    """Add campaign_hash column to dataframe."""
    df = df.copy()
    df['campaign_hash'] = df.apply(
        lambda row: generate_campaign_hash(
            row['provider_id'],
            row['discount_type'],
            row['bonus_percentage'],
            row['spend_objective']
        ),
        axis=1
    )
    return df


def compare_snapshots(
    previous_df: Optional[pd.DataFrame],
    current_df: pd.DataFrame,
    process_date: datetime
) -> List[Dict[str, Any]]:
    """
    Compare two snapshots and detect changelog events.
    
    Args:
        previous_df: Previous day's snapshot (None for first run)
        current_df: Current day's snapshot
        process_date: Date of processing
        
    Returns:
        List of changelog entries
    """
    entries = []
    date_str = process_date.strftime('%Y-%m-%d')
    
    # Add hashes
    current_df = add_campaign_hash(current_df)
    current_hashes = set(current_df['campaign_hash'].unique())
    
    if previous_df is None or previous_df.empty:
        # First run - all campaigns are new
        for _, row in current_df.drop_duplicates(subset=['campaign_hash']).iterrows():
            entry = create_changelog_entry(
                event_type='campaign-start',
                row=row,
                date=date_str,
                process_date=process_date
            )
            entries.append(entry)
        return entries
    
    previous_df = add_campaign_hash(previous_df)
    previous_hashes = set(previous_df['campaign_hash'].unique())
    
    # Create hash -> row lookups (use first occurrence)
    prev_lookup = previous_df.drop_duplicates(subset=['campaign_hash']).set_index('campaign_hash')
    curr_lookup = current_df.drop_duplicates(subset=['campaign_hash']).set_index('campaign_hash')
    
    # Detect campaign-start (new campaigns)
    new_hashes = current_hashes - previous_hashes
    for h in new_hashes:
        row = curr_lookup.loc[h]
        entry = create_changelog_entry(
            event_type='campaign-start',
            row=row,
            date=date_str,
            process_date=process_date
        )
        entries.append(entry)
    
    # Detect campaign-end (removed campaigns)
    ended_hashes = previous_hashes - current_hashes
    for h in ended_hashes:
        row = prev_lookup.loc[h]
        entry = create_changelog_entry(
            event_type='campaign-end',
            row=row,
            date=date_str,
            process_date=process_date
        )
        entries.append(entry)
    
    # Detect campaign-update (existing campaigns with changed values)
    common_hashes = current_hashes & previous_hashes
    for h in common_hashes:
        prev_row = prev_lookup.loc[h]
        curr_row = curr_lookup.loc[h]
        
        changed_fields = detect_changes(prev_row, curr_row)
        
        if changed_fields:
            entry = create_changelog_entry(
                event_type='campaign-update',
                row=curr_row,
                date=date_str,
                process_date=process_date,
                changed_fields=changed_fields,
                previous_values={f: prev_row.get(f) for f in changed_fields}
            )
            entries.append(entry)
    
    return entries


def detect_changes(prev_row: pd.Series, curr_row: pd.Series) -> List[str]:
    """Detect which fields have changed between two rows."""
    changed = []
    
    for field in UPDATE_FIELDS:
        prev_val = prev_row.get(field)
        curr_val = curr_row.get(field)
        
        # Handle NaN comparisons
        if pd.isna(prev_val) and pd.isna(curr_val):
            continue
        if pd.isna(prev_val) or pd.isna(curr_val):
            changed.append(field)
            continue
            
        # Compare values
        if str(prev_val) != str(curr_val):
            changed.append(field)
    
    return changed


def determine_banner_action(
    event_type: str,
    changed_fields: Optional[List[str]] = None,
    campaign_start: Optional[datetime] = None,
    today: Optional[datetime] = None
) -> Optional[str]:
    """
    Determine the required banner action based on changelog event.
    
    Args:
        event_type: campaign-start, campaign-update, or campaign-end
        changed_fields: List of fields that changed (for updates)
        campaign_start: Campaign start date
        today: Current date for comparison
        
    Returns:
        banner-start, banner-update, banner-end, or None
    """
    if event_type == 'campaign-start':
        return 'banner-start'
    
    if event_type == 'campaign-end':
        return 'banner-end'
    
    if event_type == 'campaign-update' and changed_fields:
        # Check if any banner-relevant field changed
        banner_relevant = set(changed_fields) & set(BANNER_UPDATE_FIELDS)
        
        if banner_relevant:
            return 'banner-update'
        
        # Check if campaign_start changed for a future campaign
        if 'campaign_start' in changed_fields and campaign_start and today:
            if campaign_start > today:
                return 'banner-update'
    
    return None


def create_changelog_entry(
    event_type: str,
    row: pd.Series,
    date: str,
    process_date: datetime,
    changed_fields: Optional[List[str]] = None,
    previous_values: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a structured changelog entry from a row."""
    
    campaign_start = row.get('campaign_start')
    if isinstance(campaign_start, str):
        try:
            campaign_start = datetime.fromisoformat(campaign_start)
        except:
            campaign_start = None
    
    banner_action = determine_banner_action(
        event_type=event_type,
        changed_fields=changed_fields,
        campaign_start=campaign_start,
        today=process_date
    )
    
    entry = {
        'date': date,
        'event_type': event_type,
        'campaign_hash': row.get('campaign_hash', row.name if isinstance(row.name, str) else None),
        'banner_action': banner_action,
        'provider_id': str(row.get('provider_id', '')),
        'provider_name': str(row.get('provider_name', '')),
        'account_manager': str(row.get('account_manager', '')),
        'city': str(row.get('city', '')),
        'campaign_id': str(row.get('campaign_id', '')),
        'discount_type': str(row.get('discount_type', '')),
        'bonus_type': str(row.get('bonus_type', '')),
        'bonus_percentage': str(row.get('bonus_percentage', '')),
        'bonus_max_value': str(row.get('bonus_max_value', '')),
        'spend_objective': str(row.get('spend_objective', '')),
        'min_basket_size': str(row.get('min_basket_size', '')),
        'cost_share_percentage': str(row.get('cost_share_percentage', '')),
        'campaign_start': str(row.get('campaign_start', '')),
        'campaign_end': str(row.get('campaign_end', '')),
    }
    
    if changed_fields:
        entry['changed_fields'] = changed_fields
    
    if previous_values:
        entry['previous_values'] = {k: str(v) for k, v in previous_values.items()}
    
    return entry
