/**
 * Application Configuration
 *
 * Centralized configuration management using environment variables.
 * All configuration values should be accessed through this module.
 */

/**
 * Parse a string environment variable as a number with fallback
 */
function getNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse a string environment variable as a boolean with fallback
 */
function getBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() !== 'false';
}

/**
 * Couchbase Edge Server Configuration
 */
export const couchbaseConfig = {
  /**
   * URL of the Couchbase Lite Edge Server
   * In development, uses Vite proxy (/api/couchbase) to avoid CORS
   * In production, use actual server URL via VITE_COUCHBASE_URL
   * @default '/api/couchbase'
   */
  edgeServerUrl: import.meta.env.VITE_COUCHBASE_URL || '/api/couchbase',

  /**
   * Database name for IKEA products
   * @default 'ikea_products'
   */
  database: import.meta.env.VITE_COUCHBASE_DB || 'ikea_products',

  /**
   * Request timeout in milliseconds
   * @default 5000
   */
  timeout: getNumberEnv(import.meta.env.VITE_REQUEST_TIMEOUT, 5000),

  /**
   * Sync status polling interval in milliseconds
   * @default 10000
   */
  syncPollInterval: getNumberEnv(import.meta.env.VITE_SYNC_POLL_INTERVAL, 10000),

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  retryAttempts: getNumberEnv(import.meta.env.VITE_RETRY_ATTEMPTS, 3),

  /**
   * Delay between retry attempts in milliseconds
   * @default 1000
   */
  retryDelay: getNumberEnv(import.meta.env.VITE_RETRY_DELAY, 1000),
} as const;

/**
 * API Configuration
 */
export const apiConfig = {
  /**
   * FastAPI backend URL
   * @default 'http://127.0.0.1:8000'
   */
  fastApiUrl: import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000',
} as const;

/**
 * Stock Level Thresholds
 * Centralized constants for consistent stock level categorization
 */
export const stockThresholds = {
  /** Stock at or below this is considered "out of stock" */
  outOfStock: 0,
  /** Stock at or below this (but > 0) is considered "low" */
  low: 10,
  /** Stock at or below this (but > low) is considered "medium" */
  medium: 50,
  // Above medium is "in stock" / "well stocked"
} as const;

/**
 * Stock level helper functions
 */
export function getStockLevel(quantity: number): 'outOfStock' | 'low' | 'medium' | 'inStock' {
  if (quantity <= stockThresholds.outOfStock) return 'outOfStock';
  if (quantity <= stockThresholds.low) return 'low';
  if (quantity <= stockThresholds.medium) return 'medium';
  return 'inStock';
}

export function isLowStock(quantity: number): boolean {
  return quantity > 0 && quantity <= stockThresholds.low;
}

export function isCriticalStock(quantity: number): boolean {
  return quantity <= stockThresholds.low;
}

/**
 * Feature Flags
 */
export const featureFlags = {
  /**
   * Enable offline mode functionality
   * @default true
   */
  offlineMode: getBooleanEnv(import.meta.env.VITE_OFFLINE_MODE, true),

  /**
   * Enable camera scanner feature
   * @default true
   */
  cameraScanner: getBooleanEnv(import.meta.env.VITE_CAMERA_SCANNER, true),
} as const;

/**
 * Unified application configuration
 */
export const config = {
  couchbase: couchbaseConfig,
  api: apiConfig,
  features: featureFlags,
  stock: stockThresholds,
} as const;

/**
 * Helper function to get the full database URL
 */
export function getDatabaseUrl(): string {
  return `${config.couchbase.edgeServerUrl}/${config.couchbase.database}`;
}

/**
 * Helper function to get document URL by ID
 */
export function getDocumentUrl(docId: string): string {
  return `${getDatabaseUrl()}/${encodeURIComponent(docId)}`;
}

/**
 * Helper function to get all documents URL
 */
export function getAllDocsUrl(): string {
  return `${getDatabaseUrl()}/_all_docs`;
}

// Export individual configs for convenience
export default config;
