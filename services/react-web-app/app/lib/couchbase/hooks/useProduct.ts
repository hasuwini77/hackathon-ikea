/**
 * React hook to fetch a single product by ID or article number
 */

import { useState, useEffect, useCallback } from 'react';
import { getDocument } from '../client';
import type { ProductDocument } from '../types';
import { CouchbaseClientError } from '../client';

interface UseProductResult {
  product: ProductDocument | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Creates a product document ID from an article number
 */
function createProductId(articleNumber: string): string {
  return `product:${articleNumber}`;
}

/**
 * Hook to fetch a single product
 *
 * @param identifier - Document ID (e.g., "product:002.638.50") or article number (e.g., "002.638.50")
 * @param isArticleNumber - If true, treats identifier as article number and constructs the document ID
 * @returns Product data, loading state, and error information
 */
export function useProduct(
  identifier: string | undefined,
  isArticleNumber: boolean = false
): UseProductResult {
  const [product, setProduct] = useState<ProductDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!identifier) {
      setProduct(null);
      setLoading(false);
      setError(null);
      setIsOffline(false);
      return;
    }

    let cancelled = false;

    async function fetchProduct() {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      try {
        // identifier is guaranteed to be defined here by the guard above
        if (!identifier) return;

        // Construct the document ID
        const docId = isArticleNumber ? createProductId(identifier) : identifier;

        // Fetch by document ID
        const productDoc = await getDocument(docId) as ProductDocument;

        if (!cancelled) {
          setProduct(productDoc);
          setError(null);
          setIsOffline(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof CouchbaseClientError) {
            setError(err.message);
            setIsOffline(err.isOffline);

            // Handle 404 gracefully - not an error state for UI
            if (err.status === 404) {
              setProduct(null);
            }
          } else {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            setIsOffline(false);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [identifier, isArticleNumber, refetchTrigger]);

  return {
    product,
    loading,
    error,
    isOffline,
    refetch,
  };
}
