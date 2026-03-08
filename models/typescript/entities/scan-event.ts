/**
 * ScanEvent Entity - Product Scan History
 *
 * Tracks barcode scan events for inventory management and analytics.
 * Each scan records the product, user, timestamp, and optional location.
 */

export interface ScanEvent {
  /** Document ID in format "scan:UUID" */
  _id: string;

  /** Couchbase revision for conflict resolution */
  _rev?: string;

  /** Document type discriminator */
  type: "scan";

  /** Product ID that was scanned (e.g., "product:702.758.14") */
  productId: string;

  /** Article number from barcode (e.g., "702.758.14") */
  articleNumber: string;

  /** User ID who performed the scan */
  userId: string;

  /** ISO 8601 timestamp of scan */
  timestamp: string;

  /** Optional warehouse location where scan occurred */
  location?: {
    aisle?: number;
    bay?: number;
    section?: string;
  };

  /** Device ID that performed the scan */
  deviceId?: string;

  /** Optional notes or metadata */
  notes?: string;

  /** ISO 8601 timestamp of last sync with backend */
  _syncedAt?: string;

  /** Flag indicating pending changes to sync */
  _pendingSync?: boolean;
}

/**
 * Type guard to check if an object is a ScanEvent
 */
export function isScanEvent(obj: any): obj is ScanEvent {
  return (
    obj &&
    typeof obj._id === 'string' &&
    obj.type === 'scan' &&
    typeof obj.productId === 'string' &&
    typeof obj.articleNumber === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Creates a ScanEvent document ID
 */
export function createScanEventId(): string {
  // Generate a simple timestamp-based UUID for offline creation
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `scan:${timestamp}-${random}`;
}

/**
 * Creates a new ScanEvent from scan data
 */
export function createScanEvent(
  productId: string,
  articleNumber: string,
  userId: string,
  options?: {
    location?: ScanEvent['location'];
    deviceId?: string;
    notes?: string;
  }
): ScanEvent {
  return {
    _id: createScanEventId(),
    type: 'scan',
    productId,
    articleNumber,
    userId,
    timestamp: new Date().toISOString(),
    location: options?.location,
    deviceId: options?.deviceId,
    notes: options?.notes,
    _pendingSync: true,
  };
}
