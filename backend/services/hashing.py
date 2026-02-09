"""
Campaign hash generation for unique identification.
"""
import hashlib
import base64


def generate_campaign_hash(
    provider_id: str,
    discount_type: str,
    bonus_percentage: str,
    spend_objective: str
) -> str:
    """
    Generate a short, unique, reproducible alphanumeric hash for a campaign.
    
    The hash uniquely identifies a campaign based on:
    - Provider ID
    - Discount Type
    - Bonus Data Percentage
    - Spend Objective
    
    Returns:
        8-character alphanumeric hash
    """
    # Normalize inputs
    components = [
        str(provider_id).strip(),
        str(discount_type).strip().lower(),
        str(bonus_percentage).strip(),
        str(spend_objective).strip().lower()
    ]
    
    # Create composite key
    composite = "|".join(components)
    
    # Generate SHA256 hash and encode to base64
    hash_bytes = hashlib.sha256(composite.encode('utf-8')).digest()
    
    # Take first 6 bytes, encode to base64, remove padding
    short_hash = base64.urlsafe_b64encode(hash_bytes[:6]).decode('utf-8').rstrip('=')
    
    return short_hash
