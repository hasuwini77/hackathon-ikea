"""
API Response Types

Standard response wrappers for API endpoints.
Provides consistent structure for success and error responses.
"""

from typing import Generic, TypeVar, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field

from ..entities.product import Product
from ..entities.scan_event import ScanEvent

T = TypeVar("T")


class ApiError(BaseModel):
    """Standard API error response"""

    error: str = Field(..., description="Error code or type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
    timestamp: Optional[str] = Field(None, description="ISO 8601 timestamp of error")

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "NOT_FOUND",
                "message": "Product not found",
                "details": {"articleNumber": "702.758.14"},
                "timestamp": "2026-03-03T10:30:00Z",
            }
        }
    }


class ApiResponse(BaseModel, Generic[T]):
    """Standard API success response wrapper"""

    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[ApiError] = Field(None, description="Error information if success=False")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    model_config = {"json_schema_extra": {"example": {"success": True, "data": {}, "timestamp": "2026-03-03T10:30:00Z"}}}


class PaginationMeta(BaseModel):
    """Paginated response metadata"""

    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., alias="pageSize", ge=1, description="Number of items per page")
    total_pages: int = Field(..., alias="totalPages", ge=0, description="Total number of pages")
    total_count: int = Field(..., alias="totalCount", ge=0, description="Total number of items")
    has_next: bool = Field(..., alias="hasNext", description="Whether there is a next page")
    has_previous: bool = Field(..., alias="hasPrevious", description="Whether there is a previous page")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "page": 1,
                "pageSize": 20,
                "totalPages": 5,
                "totalCount": 95,
                "hasNext": True,
                "hasPrevious": False,
            }
        },
    }


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response"""

    success: bool = Field(default=True)
    data: list[T] = Field(..., description="List of items for current page")
    pagination: PaginationMeta = Field(..., description="Pagination metadata")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    model_config = {"json_schema_extra": {"example": {"success": True, "data": [], "pagination": {}, "timestamp": "2026-03-03T10:30:00Z"}}}


# Product-specific response types
class ProductResponse(ApiResponse[Product]):
    """Response containing a single product"""

    data: Product


class ProductListResponse(PaginatedResponse[Product]):
    """Paginated response containing products"""

    data: list[Product]


class ProductSearchResponse(ApiResponse[list[Product]]):
    """Response containing search results"""

    data: list[Product]


# ScanEvent-specific response types
class ScanEventResponse(ApiResponse[ScanEvent]):
    """Response containing a single scan event"""

    data: ScanEvent


class ScanEventListResponse(PaginatedResponse[ScanEvent]):
    """Paginated response containing scan events"""

    data: list[ScanEvent]


# Sync-related responses
class SyncStatus(BaseModel):
    """Synchronization status information"""

    last_sync: Optional[str] = Field(None, alias="lastSync", description="ISO 8601 timestamp of last sync")
    pending_changes: int = Field(..., alias="pendingChanges", ge=0, description="Number of pending changes")
    conflicts: int = Field(..., ge=0, description="Number of sync conflicts")
    status: Literal["idle", "syncing", "error"] = Field(..., description="Current sync status")
    error: Optional[str] = Field(None, description="Error message if status=error")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "lastSync": "2026-03-03T10:30:00Z",
                "pendingChanges": 0,
                "conflicts": 0,
                "status": "idle",
            }
        },
    }


class SyncResponse(ApiResponse[SyncStatus]):
    """Response containing sync status"""

    data: SyncStatus


# Bulk operation responses
class BulkOperationResult(BaseModel):
    """Result of a bulk operation"""

    successful: int = Field(..., ge=0, description="Number of successful operations")
    failed: int = Field(..., ge=0, description="Number of failed operations")
    errors: list[dict] = Field(default_factory=list, description="List of errors for failed operations")

    model_config = {
        "json_schema_extra": {
            "example": {
                "successful": 45,
                "failed": 2,
                "errors": [{"id": "product:123", "error": "Validation failed"}],
            }
        }
    }


class BulkOperationResponse(ApiResponse[BulkOperationResult]):
    """Response for bulk operations"""

    data: BulkOperationResult


# Stock update request/response
class StockUpdateRequest(BaseModel):
    """Request to update product stock"""

    article_number: str = Field(..., alias="articleNumber", description="Article number of product")
    stock: int = Field(..., ge=0, description="New stock quantity")
    user_id: str = Field(..., alias="userId", description="User ID performing the update")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {"example": {"articleNumber": "702.758.14", "stock": 50, "userId": "user123"}},
    }


class StockUpdateResponse(ApiResponse[Product]):
    """Response for stock update"""

    data: Product


# Helper functions
def create_success_response(data: T) -> ApiResponse[T]:
    """Creates a successful API response"""
    return ApiResponse(success=True, data=data, timestamp=datetime.utcnow().isoformat() + "Z")


def create_error_response(error: str, message: str, details: Optional[dict] = None) -> ApiResponse:
    """Creates an error API response"""
    return ApiResponse(
        success=False,
        error=ApiError(error=error, message=message, details=details, timestamp=datetime.utcnow().isoformat() + "Z"),
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


def create_paginated_response(
    data: list[T], page: int, page_size: int, total_count: int
) -> PaginatedResponse[T]:
    """Creates a paginated response"""
    import math

    total_pages = math.ceil(total_count / page_size) if page_size > 0 else 0

    return PaginatedResponse(
        success=True,
        data=data,
        pagination=PaginationMeta(
            page=page,
            pageSize=page_size,
            totalPages=total_pages,
            totalCount=total_count,
            hasNext=page < total_pages,
            hasPrevious=page > 1,
        ),
        timestamp=datetime.utcnow().isoformat() + "Z",
    )
