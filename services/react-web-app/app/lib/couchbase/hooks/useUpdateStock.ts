/**
 * React hook to update product stock using Couchbase
 */

import { useState, useCallback } from 'react';
import { getDocument, putDocument } from '../client';
import type { ProductDocument, ProductStock } from '../types';
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

      // Update the stock quantity and lastUpdated timestamp
      const { _id, _rev, ...docData } = currentDoc;

      // Handle both stock formats: number or object { quantity, location }
      let updatedStock: ProductStock | number;
      if (typeof currentDoc.stock === 'number') {
        // If stock is a direct number, keep it as a number
        updatedStock = newQuantity;
      } else {
        // If stock is an object, preserve the location and update quantity
        updatedStock = {
          ...currentDoc.stock,
          quantity: newQuantity,
        };
      }

      const updatedDoc = {
        ...docData,
        stock: updatedStock,
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
