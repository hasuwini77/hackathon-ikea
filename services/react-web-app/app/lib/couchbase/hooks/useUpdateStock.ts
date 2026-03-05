/**
 * React hook to update product stock using Couchbase
 */

import { useState, useCallback } from 'react';
import { getDocument, putDocument } from '../client';
import type { ProductDocument } from '../types';
import { useOfflineQueue } from './useOfflineQueue';

interface UseUpdateStockResult {
  updateStock: (productId: string, newQuantity: number) => Promise<void>;
  updating: boolean;
  error: string | null;
}

/**
 * Hook to update product stock quantity
 *
 * Updates the stock quantity in Couchbase, handling offline scenarios
 * by queuing the operation for later sync
 */
export function useUpdateStock(): UseUpdateStockResult {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { queueWrite } = useOfflineQueue();

  const updateStock = useCallback(async (productId: string, newQuantity: number) => {
    setUpdating(true);
    setError(null);

    try {
      // First, fetch the current document to get the latest revision
      const currentDoc = await getDocument(productId) as ProductDocument;

      if (!currentDoc._rev) {
        throw new Error('Document revision not found');
      }

      // Update the stock quantity and lastUpdated timestamp
      const { _id, _rev, ...docData } = currentDoc;
      const updatedDoc = {
        ...docData,
        stock: {
          ...currentDoc.stock,
          quantity: newQuantity,
        },
        lastUpdated: new Date().toISOString(),
      };

      // Try to update, will queue if offline
      await queueWrite(productId, updatedDoc, _rev);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stock';
      setError(errorMessage);
      console.error('Error updating stock:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [queueWrite]);

  return {
    updateStock,
    updating,
    error,
  };
}
