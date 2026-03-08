"""
ScanEvent Entity - Product Scan History

Tracks barcode scan events for inventory management and analytics.
Each scan records the product, user, timestamp, and optional location.
"""

from typing import Literal, Optional
from datetime import datetime
import time
import random
import string
from pydantic import BaseModel, Field, field_validator


class ScanLocation(BaseModel):
    """Optional location where scan occurred"""

    aisle: Optional[int] = Field(None, description="Aisle number in warehouse")
    bay: Optional[int] = Field(None, description="Bay number within aisle")
    section: Optional[str] = Field(None, description="Section identifier")

    model_config = {"json_schema_extra": {"example": {"aisle": 12, "bay": 3, "section": "A"}}}


class ScanEvent(BaseModel):
    """Product scan event entity"""

    id: str = Field(..., alias="_id", description='Document ID in format "scan:UUID"')
    rev: Optional[str] = Field(None, alias="_rev", description="Couchbase revision for conflict resolution")
    type: Literal["scan"] = Field(default="scan", description="Document type discriminator")

    product_id: str = Field(
        ..., alias="productId", description='Product ID that was scanned (e.g., "product:702.758.14")'
    )
    article_number: str = Field(
        ..., alias="articleNumber", description='Article number from barcode (e.g., "702.758.14")'
    )

    user_id: str = Field(..., alias="userId", description="User ID who performed the scan")
    timestamp: str = Field(..., description="ISO 8601 timestamp of scan")

    location: Optional[ScanLocation] = Field(None, description="Optional warehouse location where scan occurred")
    device_id: Optional[str] = Field(None, alias="deviceId", description="Device ID that performed the scan")
    notes: Optional[str] = Field(None, description="Optional notes or metadata")

    synced_at: Optional[str] = Field(
        None, alias="_syncedAt", description="ISO 8601 timestamp of last sync with backend"
    )
    pending_sync: bool = Field(
        False, alias="_pendingSync", description="Flag indicating pending changes to sync"
    )

    @field_validator("timestamp", "synced_at")
    @classmethod
    def validate_iso_timestamp(cls, v):
        """Validate ISO 8601 timestamp format"""
        if v is not None:
            try:
                datetime.fromisoformat(v.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                raise ValueError("Timestamp must be in ISO 8601 format")
        return v

    @field_validator("product_id")
    @classmethod
    def validate_product_id(cls, v):
        """Validate product_id format"""
        if not v.startswith("product:"):
            raise ValueError("product_id must start with 'product:'")
        return v

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "_id": "scan:1709437800000-abc123",
                "_rev": "1-def456",
                "type": "scan",
                "productId": "product:702.758.14",
                "articleNumber": "702.758.14",
                "userId": "user123",
                "timestamp": "2026-03-03T10:30:00Z",
                "location": {"aisle": 12, "bay": 3, "section": "A"},
                "deviceId": "device-001",
                "notes": "Stock check scan",
                "_syncedAt": "2026-03-03T10:30:05Z",
                "_pendingSync": False,
            }
        },
    }


def create_scan_event_id() -> str:
    """
    Creates a ScanEvent document ID

    Generates a timestamp-based UUID for offline creation
    """
    timestamp = int(time.time() * 1000)  # milliseconds
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=13))
    return f"scan:{timestamp}-{random_str}"


def create_scan_event(
    product_id: str,
    article_number: str,
    user_id: str,
    location: Optional[ScanLocation] = None,
    device_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> ScanEvent:
    """
    Creates a new ScanEvent from scan data

    Args:
        product_id: Product ID (e.g., "product:702.758.14")
        article_number: Article number from barcode
        user_id: User performing the scan
        location: Optional warehouse location
        device_id: Optional device identifier
        notes: Optional notes

    Returns:
        ScanEvent instance ready to be saved
    """
    return ScanEvent(
        _id=create_scan_event_id(),
        type="scan",
        productId=product_id,
        articleNumber=article_number,
        userId=user_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        location=location,
        deviceId=device_id,
        notes=notes,
        _pendingSync=True,
    )
