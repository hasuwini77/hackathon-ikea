"""
Type definitions for API responses and ephemeral data structures

This package contains types not backed by a datastore.
"""

from .responses import (
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
