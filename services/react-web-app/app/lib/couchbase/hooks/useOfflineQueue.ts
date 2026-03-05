/**
 * React hook for managing offline write queue
 *
 * Queues write operations when offline and retries them when back online
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { putDocument, deleteDocument } from '../client';
import { CouchbaseClientError } from '../client';
import type { QueuedOperation, CouchbaseDocument } from '../types';
import { useIsOnline } from './useSyncStatus';

interface UseOfflineQueueResult {
  queuedOperations: QueuedOperation[];
  pendingCount: number;
  queueWrite: (docId: string, document: Omit<CouchbaseDocument, '_id'>, rev?: string) => Promise<void>;
  queueDelete: (docId: string, rev: string) => Promise<void>;
  retryAll: () => Promise<void>;
  clearQueue: () => void;
}

const STORAGE_KEY = 'couchbase_offline_queue';
const MAX_RETRY_COUNT = 5;

/**
 * Load queued operations from localStorage
 */
function loadQueueFromStorage(): QueuedOperation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Restore Date objects
    return parsed.map((op: any) => ({
      ...op,
      timestamp: new Date(op.timestamp),
    }));
  } catch {
    return [];
  }
}

/**
 * Save queued operations to localStorage
 */
function saveQueueToStorage(queue: QueuedOperation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

/**
 * Hook for managing offline write operations queue
 *
 * Automatically retries queued operations when connection is restored
 */
export function useOfflineQueue(): UseOfflineQueueResult {
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const isOnline = useIsOnline(5000);
  const processingRef = useRef<boolean>(false);

  // Load queue from storage on mount
  useEffect(() => {
    const storedQueue = loadQueueFromStorage();
    setQueue(storedQueue);
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    saveQueueToStorage(queue);
  }, [queue]);

  /**
   * Process a single queued operation
   */
  const processOperation = useCallback(async (operation: QueuedOperation): Promise<boolean> => {
    try {
      if (operation.type === 'put') {
        const { _id, _rev, ...docData } = operation.document;
        await putDocument(_id, docData, _rev);
      } else if (operation.type === 'delete') {
        const { _id, _rev } = operation.document;
        if (!_rev) {
          throw new Error('Revision required for delete operation');
        }
        await deleteDocument(_id, _rev);
      }

      return true; // Success
    } catch (err) {
      if (err instanceof CouchbaseClientError) {
        // If it's a conflict or client error, remove from queue (don't retry)
        if (err.status && err.status >= 400 && err.status < 500) {
          console.error(`Dropping operation ${operation.id} due to client error:`, err.message);
          return true; // Return true to remove from queue
        }

        // If offline, keep in queue
        if (err.isOffline) {
          return false;
        }
      }

      // For other errors, retry up to max count
      console.error(`Error processing operation ${operation.id}:`, err);
      return false;
    }
  }, []);

  /**
   * Process all queued operations
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline || queue.length === 0) {
      return;
    }

    processingRef.current = true;

    try {
      const remainingQueue: QueuedOperation[] = [];

      for (const operation of queue) {
        // Skip if max retries reached
        if (operation.retryCount >= MAX_RETRY_COUNT) {
          console.error(`Max retries reached for operation ${operation.id}, dropping`);
          continue;
        }

        const success = await processOperation(operation);

        if (!success) {
          // Keep in queue with incremented retry count
          remainingQueue.push({
            ...operation,
            retryCount: operation.retryCount + 1,
            error: 'Retry failed',
          });
        }
        // If success, don't add to remaining queue (effectively removing it)
      }

      setQueue(remainingQueue);
    } finally {
      processingRef.current = false;
    }
  }, [isOnline, queue, processOperation]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  /**
   * Queue a write operation
   */
  const queueWrite = useCallback(async (
    docId: string,
    document: Omit<CouchbaseDocument, '_id'>,
    rev?: string
  ): Promise<void> => {
    // Try immediate write if online
    if (isOnline) {
      try {
        await putDocument(docId, document, rev);
        return; // Success, no need to queue
      } catch (err) {
        // If online but failed, fall through to queue
        if (err instanceof CouchbaseClientError && !err.isOffline) {
          throw err; // Rethrow non-offline errors
        }
      }
    }

    // Queue the operation
    const operation: QueuedOperation = {
      id: `${docId}-${Date.now()}`,
      type: 'put',
      document: {
        ...document,
        _id: docId,
        ...(rev && { _rev: rev }),
      },
      timestamp: new Date(),
      retryCount: 0,
    };

    setQueue(prev => [...prev, operation]);
  }, [isOnline]);

  /**
   * Queue a delete operation
   */
  const queueDelete = useCallback(async (
    docId: string,
    rev: string
  ): Promise<void> => {
    // Try immediate delete if online
    if (isOnline) {
      try {
        await deleteDocument(docId, rev);
        return; // Success, no need to queue
      } catch (err) {
        // If online but failed, fall through to queue
        if (err instanceof CouchbaseClientError && !err.isOffline) {
          throw err; // Rethrow non-offline errors
        }
      }
    }

    // Queue the operation
    const operation: QueuedOperation = {
      id: `${docId}-${Date.now()}`,
      type: 'delete',
      document: {
        _id: docId,
        _rev: rev,
      },
      timestamp: new Date(),
      retryCount: 0,
    };

    setQueue(prev => [...prev, operation]);
  }, [isOnline]);

  /**
   * Manually retry all queued operations
   */
  const retryAll = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  /**
   * Clear all queued operations
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    queuedOperations: queue,
    pendingCount: queue.length,
    queueWrite,
    queueDelete,
    retryAll,
    clearQueue,
  };
}
