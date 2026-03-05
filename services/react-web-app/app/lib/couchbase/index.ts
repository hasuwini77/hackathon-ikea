/**
 * Couchbase Lite React Client
 *
 * Offline-first data access layer for connecting to Couchbase Edge Server
 */

// Configuration
export {
  EDGE_SERVER_URL,
  DATABASE_NAME,
  REQUEST_TIMEOUT,
  SYNC_STATUS_POLL_INTERVAL,
  getDatabaseUrl,
  getDocumentUrl,
  getAllDocsUrl,
} from './config';

// Types
export type {
  CouchbaseDocument,
  ProductDocument,
  AllDocsResponse,
  CouchbaseError,
  SyncStatus,
  QueuedOperation,
} from './types';

// Client functions
export {
  getDocument,
  putDocument,
  deleteDocument,
  getAllDocuments,
  searchProducts,
  checkServerStatus,
  getDatabaseInfo,
  createProductId,
  getArticleNumberFromId,
  CouchbaseClientError,
} from './client';

// Hooks
export { useProduct } from './hooks/useProduct';
export { useProducts } from './hooks/useProducts';
export { useSyncStatus, useIsOnline } from './hooks/useSyncStatus';
export { useOfflineQueue } from './hooks/useOfflineQueue';
export { useUpdateStock } from './hooks/useUpdateStock';

// Transforms
export {
  productDocumentToProduct,
  productToProductDocument,
  productDocumentsToProducts,
} from './transforms';
