/**
 * Type definitions for Couchbase Lite documents and API responses
 */

/**
 * Base document structure with CouchDB metadata
 */
export interface CouchbaseDocument {
  _id: string;
  _rev?: string;
  [key: string]: any;
}

/**
 * Product stock information
 */
export interface ProductStock {
  quantity: number;
  location: string;
}

/**
 * Product dimensions
 */
export interface ProductDimensions {
  depth: number | null;
  width: number | null;
  height: number | null;
  unit: string;
}

/**
 * Product weight information
 */
export interface ProductWeight {
  value: number;
  unit: string;
}

/**
 * Actual Product document structure as stored in Couchbase Edge Server
 * This matches the real document format with zone, aisle, bay, section fields
 */
export interface ProductDocument extends CouchbaseDocument {
  type: 'product';
  articleNumber: string;
  name: string;
  description: string;
  category: string;
  productType: string;
  price: number;
  currency: string;
  stock: ProductStock | number; // Can be either object { quantity, location } or direct number
  dimensions: ProductDimensions;
  weight: ProductWeight | number; // Can be either object or number for backwards compatibility
  tags: string[];
  assemblyRequired?: boolean; // Optional in actual data
  inStock: boolean;
  lastUpdated: string;
  _syncedAt?: string;
  _pendingSync?: boolean;

  // Warehouse location fields (top-level in actual documents)
  zone?: string;
  aisle?: number | string;
  bay?: number | string;
  section?: string;
  subcategory?: string; // Additional field in actual data
}

/**
 * Response from _all_docs endpoint
 */
export interface AllDocsResponse {
  total_rows: number;
  offset: number;
  rows: Array<{
    id: string;
    key: string;
    value: {
      rev: string;
    };
    doc?: CouchbaseDocument;
  }>;
}

/**
 * Error response from Couchbase Edge Server
 */
export interface CouchbaseError {
  error: string;
  reason: string;
  status?: number;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  isOnline: boolean;
  lastSynced?: Date;
  pendingChanges: number;
  error?: string;
}

/**
 * Queued write operation
 */
export interface QueuedOperation {
  id: string;
  type: 'put' | 'delete';
  document: CouchbaseDocument;
  timestamp: Date;
  retryCount: number;
  error?: string;
}
