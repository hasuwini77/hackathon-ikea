"""
IKEA Warehouse Models - Python

Shared data models for the IKEA offline-first warehouse application.
"""

# Entities
from .entities.product import (
    Product,
    ProductLocation,
    create_product_id,
    get_article_number_from_id,
)
from .entities.scan_event import (
    ScanEvent,
    ScanLocation,
    create_scan_event_id,
    create_scan_event,
)

# Response Types
from .types.responses import (
    ApiError,
    ApiResponse,
    PaginationMeta,
    PaginatedResponse,
    ProductResponse,
    ProductListResponse,
    ProductSearchResponse,
    ScanEventResponse,
    ScanEventListResponse,
    SyncStatus,
    SyncResponse,
    BulkOperationResult,
    BulkOperationResponse,
    StockUpdateRequest,
    StockUpdateResponse,
    create_success_response,
    create_error_response,
    create_paginated_response,
)

__all__ = [
    # Entities
    "Product",
    "ProductLocation",
    "create_product_id",
    "get_article_number_from_id",
    "ScanEvent",
    "ScanLocation",
    "create_scan_event_id",
    "create_scan_event",
    # Response Types
    "ApiError",
    "ApiResponse",
    "PaginationMeta",
    "PaginatedResponse",
    "ProductResponse",
    "ProductListResponse",
    "ProductSearchResponse",
    "ScanEventResponse",
    "ScanEventListResponse",
    "SyncStatus",
    "SyncResponse",
    "BulkOperationResult",
    "BulkOperationResponse",
    "StockUpdateRequest",
    "StockUpdateResponse",
    "create_success_response",
    "create_error_response",
    "create_paginated_response",
]
