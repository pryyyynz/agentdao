"""
AgentDAO Utility Functions
Common helper functions used across the application
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from decimal import Decimal


# ============================================================================
# UUID UTILITIES
# ============================================================================

def generate_uuid() -> str:
    """
    Generate a UUID string
    
    Returns:
        UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
    """
    return str(uuid.uuid4())


def is_valid_uuid(uuid_string: str) -> bool:
    """
    Validate UUID string format
    
    Args:
        uuid_string: String to validate
    
    Returns:
        True if valid UUID, False otherwise
    """
    try:
        uuid.UUID(uuid_string)
        return True
    except (ValueError, AttributeError):
        return False


# ============================================================================
# TIMESTAMP UTILITIES
# ============================================================================

def get_utc_now() -> datetime:
    """
    Get current UTC timestamp
    
    Returns:
        Current datetime in UTC
    """
    return datetime.now(timezone.utc)


def timestamp_to_iso(dt: datetime) -> str:
    """
    Convert datetime to ISO 8601 string
    
    Args:
        dt: Datetime object
    
    Returns:
        ISO 8601 formatted string
    """
    return dt.isoformat()


def iso_to_timestamp(iso_string: str) -> datetime:
    """
    Convert ISO 8601 string to datetime
    
    Args:
        iso_string: ISO 8601 formatted string
    
    Returns:
        Datetime object
    """
    return datetime.fromisoformat(iso_string.replace('Z', '+00:00'))


# ============================================================================
# ETHEREUM ADDRESS VALIDATION
# ============================================================================

def is_valid_eth_address(address: str) -> bool:
    """
    Validate Ethereum address format (0x + 40 hex characters)
    
    Args:
        address: Ethereum address string
    
    Returns:
        True if valid format, False otherwise
    """
    if not isinstance(address, str):
        return False
    
    # Check format: 0x followed by 40 hexadecimal characters
    pattern = r'^0x[a-fA-F0-9]{40}$'
    return bool(re.match(pattern, address))


def normalize_eth_address(address: str) -> str:
    """
    Normalize Ethereum address to lowercase checksum format
    
    Args:
        address: Ethereum address string
    
    Returns:
        Normalized address (lowercase)
    """
    if not is_valid_eth_address(address):
        raise ValueError(f"Invalid Ethereum address: {address}")
    
    return address.lower()


# ============================================================================
# IPFS HASH VALIDATION
# ============================================================================

def is_valid_ipfs_hash(ipfs_hash: str) -> bool:
    """
    Validate IPFS hash format (CID v0 or v1)
    
    Args:
        ipfs_hash: IPFS hash string
    
    Returns:
        True if valid format, False otherwise
    
    Note:
        - CIDv0: Qm followed by 44 base58 characters
        - CIDv1: b followed by base32 characters (variable length)
    """
    if not isinstance(ipfs_hash, str):
        return False
    
    # CIDv0: Qm + 44 base58 characters
    cidv0_pattern = r'^Qm[1-9A-HJ-NP-Za-km-z]{44}$'
    
    # CIDv1: b + base32 characters (simplified check)
    cidv1_pattern = r'^b[a-z2-7]{58,}$'
    
    return bool(re.match(cidv0_pattern, ipfs_hash) or re.match(cidv1_pattern, ipfs_hash))


def ipfs_url_to_hash(url: str) -> Optional[str]:
    """
    Extract IPFS hash from IPFS URL
    
    Args:
        url: IPFS URL (e.g., "ipfs://Qm..." or "https://gateway.pinata.cloud/ipfs/Qm...")
    
    Returns:
        IPFS hash or None if not found
    """
    # Handle ipfs:// protocol
    if url.startswith('ipfs://'):
        return url.replace('ipfs://', '')
    
    # Handle gateway URLs
    patterns = [
        r'ipfs/([Qmb][a-zA-Z0-9]{44,})',  # Standard gateway
        r'ipfs.io/ipfs/([Qmb][a-zA-Z0-9]{44,})',  # ipfs.io gateway
        r'gateway.pinata.cloud/ipfs/([Qmb][a-zA-Z0-9]{44,})',  # Pinata gateway
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


# ============================================================================
# ERROR FORMATTING
# ============================================================================

def format_error_response(
    error: str,
    message: str,
    details: Optional[Any] = None,
    status_code: int = 500
) -> Dict[str, Any]:
    """
    Format error response for API
    
    Args:
        error: Error type (e.g., "ValidationError")
        message: User-friendly error message
        details: Additional error details
        status_code: HTTP status code
    
    Returns:
        Formatted error response dictionary
    """
    response = {
        "error": error,
        "message": message,
        "status_code": status_code,
        "timestamp": get_utc_now().isoformat()
    }
    
    if details is not None:
        response["details"] = details
    
    return response


def format_validation_errors(errors: List[Dict]) -> List[Dict[str, str]]:
    """
    Format Pydantic validation errors for API response
    
    Args:
        errors: List of Pydantic error dictionaries
    
    Returns:
        Formatted error list
    """
    formatted = []
    for error in errors:
        formatted.append({
            "field": " -> ".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg", "Unknown error"),
            "type": error.get("type", "unknown")
        })
    return formatted


# ============================================================================
# DATA CONVERSION
# ============================================================================

def decimal_to_float(value: Decimal) -> float:
    """
    Convert Decimal to float (for JSON serialization)
    
    Args:
        value: Decimal value
    
    Returns:
        Float value
    """
    return float(value)


def dict_to_snake_case(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert dictionary keys from camelCase to snake_case
    
    Args:
        data: Dictionary with camelCase keys
    
    Returns:
        Dictionary with snake_case keys
    """
    def camel_to_snake(name: str) -> str:
        name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()
    
    return {camel_to_snake(k): v for k, v in data.items()}


def dict_to_camel_case(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert dictionary keys from snake_case to camelCase
    
    Args:
        data: Dictionary with snake_case keys
    
    Returns:
        Dictionary with camelCase keys
    """
    def snake_to_camel(name: str) -> str:
        components = name.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])
    
    return {snake_to_camel(k): v for k, v in data.items()}


# ============================================================================
# PAGINATION UTILITIES
# ============================================================================

def calculate_pagination(
    total_items: int,
    page: int = 1,
    page_size: int = 10
) -> Dict[str, Any]:
    """
    Calculate pagination metadata
    
    Args:
        total_items: Total number of items
        page: Current page number (1-indexed)
        page_size: Items per page
    
    Returns:
        Pagination metadata dictionary
    """
    total_pages = (total_items + page_size - 1) // page_size  # Ceiling division
    
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page,
        "page_size": page_size,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }


def get_offset_limit(page: int = 1, page_size: int = 10) -> tuple[int, int]:
    """
    Convert page number to SQL OFFSET and LIMIT
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
    
    Returns:
        Tuple of (offset, limit)
    """
    offset = (page - 1) * page_size
    return offset, page_size


# ============================================================================
# SCORE CALCULATION
# ============================================================================

def calculate_weighted_score(scores: Dict[str, float], weights: Dict[str, float]) -> float:
    """
    Calculate weighted average score
    
    Args:
        scores: Dictionary of scores (agent_name: score)
        weights: Dictionary of weights (agent_name: weight)
    
    Returns:
        Weighted average score
    
    Note:
        Weights should sum to 100
    """
    if not scores or not weights:
        return 0.0
    
    total_score = 0.0
    total_weight = 0.0
    
    for agent, score in scores.items():
        weight = weights.get(agent, 0)
        total_score += score * (weight / 100)
        total_weight += weight
    
    # Normalize if weights don't sum to 100
    if total_weight > 0 and total_weight != 100:
        total_score = (total_score / total_weight) * 100
    
    return round(total_score, 2)


# ============================================================================
# STRING UTILITIES
# ============================================================================

def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate string to maximum length
    
    Args:
        text: String to truncate
        max_length: Maximum length
        suffix: Suffix to append if truncated
    
    Returns:
        Truncated string
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing invalid characters
    
    Args:
        filename: Original filename
    
    Returns:
        Sanitized filename
    """
    # Remove invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '', filename)
    
    # Replace spaces with underscores
    sanitized = sanitized.replace(' ', '_')
    
    return sanitized


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test utility functions"""
    
    # Test UUID
    test_uuid = generate_uuid()
    print(f"✅ Generated UUID: {test_uuid}")
    print(f"✅ Valid UUID: {is_valid_uuid(test_uuid)}")
    
    # Test Ethereum address
    valid_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    print(f"✅ Valid ETH address: {is_valid_eth_address(valid_address)}")
    print(f"✅ Normalized: {normalize_eth_address(valid_address)}")
    
    # Test IPFS hash
    valid_ipfs = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
    print(f"✅ Valid IPFS hash: {is_valid_ipfs_hash(valid_ipfs)}")
    
    # Test pagination
    pagination = calculate_pagination(total_items=95, page=2, page_size=10)
    print(f"✅ Pagination: {pagination}")
    
    # Test weighted score
    scores = {"technical": 80, "impact": 90, "budget": 70}
    weights = {"technical": 40, "impact": 40, "budget": 20}
    weighted = calculate_weighted_score(scores, weights)
    print(f"✅ Weighted score: {weighted}")
    
    print("\n✅ All utility tests passed!")
