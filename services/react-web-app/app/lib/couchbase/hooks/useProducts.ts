/**
 * React hook to fetch all products or search/filter products
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProductDocument } from '../types';

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
        const response = await fetch('/api/couchbase/ikea_products/_all_docs?include_docs=true');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!cancelled) {
          const productList = data.rows
            .filter((row: any) => row.doc && row.doc.type === 'product')
            .map((row: any) => row.doc as ProductDocument);

          setProducts(productList);
          setError(null);
          setIsOffline(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
          setIsOffline(true);
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
