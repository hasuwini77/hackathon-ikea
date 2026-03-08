/**
 * API Response Types
 *
 * Standard response wrappers for API endpoints.
 * Provides consistent structure for success and error responses.
 */

import { Product } from '../entities/product';
import { ScanEvent } from '../entities/scan-event';

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: any;
  timestamp?: string;
}

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

/**
 * Paginated response metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Product-specific API responses
 */
export interface ProductResponse extends ApiResponse<Product> {
  data: Product;
}

export interface ProductListResponse extends PaginatedResponse<Product> {
  data: Product[];
}

export interface ProductSearchResponse extends ApiResponse<Product[]> {
  data: Product[];
}

/**
 * ScanEvent-specific API responses
 */
export interface ScanEventResponse extends ApiResponse<ScanEvent> {
  data: ScanEvent;
}

export interface ScanEventListResponse extends PaginatedResponse<ScanEvent> {
  data: ScanEvent[];
}

/**
 * Sync-related responses
 */
export interface SyncStatus {
  lastSync?: string;
  pendingChanges: number;
  conflicts: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

export interface SyncResponse extends ApiResponse<SyncStatus> {
  data: SyncStatus;
}

/**
 * Bulk operation responses
 */
export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export interface BulkOperationResponse extends ApiResponse<BulkOperationResult> {
  data: BulkOperationResult;
}

/**
 * Stock update request/response
 */
export interface StockUpdateRequest {
  articleNumber: string;
  stock: number;
  userId: string;
}

export interface StockUpdateResponse extends ApiResponse<Product> {
  data: Product;
}

/**
 * Helper function to create a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create an error API response
 */
export function createErrorResponse(error: string, message: string, details?: any): ApiResponse<never> {
  return {
    success: false,
    error: {
      error,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalCount: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}
