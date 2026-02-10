"""
CSV parsing and normalization utilities.
"""
import pandas as pd
from pathlib import Path
from typing import Optional
from datetime import datetime


# Column mappings from CSV to internal names
COLUMN_MAPPING = {
    'Provider ID': 'provider_id',
    'Provider Name': 'provider_name',
    'Account Manager Name': 'account_manager',
    'City Name': 'city',
    'Campaign ID': 'campaign_id',
    'Campaign Spend Objective': 'spend_objective',
    'Discount Type': 'discount_type',
    'Bonus Type': 'bonus_type',
    'Bonus Data Percentage': 'bonus_percentage',
    'Bonus Data Max Value': 'bonus_max_value',
    'Min Basket Size': 'min_basket_size',
    'Cost Share Percentage': 'cost_share_percentage',
    'Smart Promo Offer Provider Enrollment Start Ts Utc Time': 'campaign_start',
    'Smart Promo Offer Provider Enrollment End Ts Utc Time': 'campaign_end',
    'Smart Promo Offer Mode': 'offer_mode',
    'Smart Promo Offer Enrollment State': 'offer_state',
}


def load_snapshot(file_path: Path) -> pd.DataFrame:
    """
    Load a CSV snapshot file and normalize column names.
    
    Args:
        file_path: Path to the CSV file
        
    Returns:
        DataFrame with normalized column names
    """
    df = pd.read_csv(file_path)
    
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    # Rename columns to internal names
    df = df.rename(columns=COLUMN_MAPPING)
    
    # Parse date columns
    date_columns = ['campaign_start', 'campaign_end']
    for col in date_columns:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    
    return df


def load_snapshot_from_bytes(data: bytes) -> pd.DataFrame:
    """
    Load a CSV snapshot from bytes and normalize column names.
    
    Args:
        data: CSV content as bytes
        
    Returns:
        DataFrame with normalized column names
    """
    import io
    df = pd.read_csv(io.BytesIO(data))
    
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    # Rename columns to internal names
    df = df.rename(columns=COLUMN_MAPPING)
    
    # Parse date columns
    date_columns = ['campaign_start', 'campaign_end']
    for col in date_columns:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    
    return df


def get_latest_snapshot(snapshots_dir: Path) -> Optional[Path]:
    """
    Get the most recent snapshot file from a directory.
    Files are expected to have date in filename.
    
    Args:
        snapshots_dir: Directory containing snapshot files
        
    Returns:
        Path to the latest snapshot file, or None if no files found
    """
    csv_files = list(snapshots_dir.glob('*.csv'))
    
    if not csv_files:
        return None
    
    # Sort by filename (assumes date ordering in filename)
    csv_files.sort(reverse=True)
    
    return csv_files[0]


def extract_date_from_filename(filename: str) -> Optional[datetime]:
    """
    Extract date from snapshot filename.
    Expected format: sim_ smart-promos-changelog files - feb3.csv
    
    Args:
        filename: Name of the file
        
    Returns:
        Extracted date or None
    """
    import re
    
    # Try to extract month and day
    match = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d+)', 
                      filename.lower())
    
    if match:
        month_str, day_str = match.groups()
        month_map = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
            'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
            'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        month = month_map.get(month_str, 1)
        day = int(day_str)
        
        # Assume current year
        year = datetime.now().year
        
        return datetime(year, month, day)
    
    return None
