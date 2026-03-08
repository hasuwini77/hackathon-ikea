/**
 * React hook to fetch all products or search/filter products
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProductDocument } from '../types';
import { getAllDocuments, searchProducts, CouchbaseClientError } from '../client';

interface UseProductsOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}

interface UseProductsResult {
  products: ProductDocument[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch all products or search with filters
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      try {
        let productList: ProductDocument[];

        // If filters are provided, use searchProducts; otherwise get all products
        if (options.category || options.minPrice !== undefined ||
            options.maxPrice !== undefined || options.query) {
          productList = await searchProducts({
            category: options.category,
            minPrice: options.minPrice,
            maxPrice: options.maxPrice,
            query: options.query,
          });
        } else {
          // Get all products directly
          const allDocs = await getAllDocuments(true);
          productList = allDocs.rows
            .filter((row) => row.doc && row.doc.type === 'product')
            .map((row) => row.doc as ProductDocument);
        }

        if (!cancelled) {
          setProducts(productList);
          setError(null);
          setIsOffline(false);
        }
      } catch (err) {
        if (!cancelled) {
          const isOfflineError = err instanceof CouchbaseClientError && err.isOffline;
          setError(err instanceof Error ? err.message : 'Failed to load products');
          setIsOffline(isOfflineError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [options.category, options.minPrice, options.maxPrice, options.query, refetchTrigger]);

  return {
    products,
    loading,
    error,
    isOffline,
    refetch,
  };
}
