/**
 * Couchbase Edge Server Configuration
 *
 * Re-exports configuration from the centralized config module.
 * Use the main config module directly for new code: import { config } from '../config'
 *
 * @deprecated This file is kept for backward compatibility.
 * Import from '../config' instead.
 */

import { config, getDatabaseUrl as _getDatabaseUrl, getDocumentUrl as _getDocumentUrl, getAllDocsUrl as _getAllDocsUrl } from '../config';

/**
 * @deprecated Use config.couchbase.edgeServerUrl instead
 */
export const EDGE_SERVER_URL = config.couchbase.edgeServerUrl;

/**
 * @deprecated Use config.couchbase.database instead
 */
export const DATABASE_NAME = config.couchbase.database;

/**
 * @deprecated Use config.couchbase.timeout instead
 */
export const REQUEST_TIMEOUT = config.couchbase.timeout;

/**
 * @deprecated Use config.couchbase.syncPollInterval instead
 */
export const SYNC_STATUS_POLL_INTERVAL = config.couchbase.syncPollInterval;

/**
 * @deprecated Use config.couchbase.retryAttempts instead
 */
export const RETRY_ATTEMPTS = config.couchbase.retryAttempts;

/**
 * @deprecated Use config.couchbase.retryDelay instead
 */
export const RETRY_DELAY = config.couchbase.retryDelay;

/**
 * Get the full database URL
 */
export const getDatabaseUrl = _getDatabaseUrl;

/**
 * Get document URL by ID
 */
export const getDocumentUrl = _getDocumentUrl;

/**
 * Get all documents URL
 */
export const getAllDocsUrl = _getAllDocsUrl;
