/**
 * React hooks for PostgreSQL API integration
 *
 * Provides hooks to fetch and update products from the PostgreSQL backend.
 * Includes offline fallback support to gracefully handle API failures.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '~/types/product';
import { fetchProducts, fetchProduct, updateStock, PostgresAPIError } from './client';
import type { PostgresProduct } from './client';

/**
 * Transform PostgresProduct to UI Product format
 */
function postgresProductToProduct(pgProduct: PostgresProduct): Product {
  // Build location string from warehouse location
  let locationString = pgProduct.zone;
  if (pgProduct.aisle !== null && pgProduct.bay !== null && pgProduct.section !== null) {
    locationString = `${pgProduct.aisle}-${pgProduct.bay}-${pgProduct.section}`;
  }

  // Parse location string to UI location format
  const location = parseLocation(locationString);

  return {
    _id: `product::${pgProduct.article_number}`,
    type: 'product',
    articleNumber: pgProduct.article_number,
    name: pgProduct.name,
    description: pgProduct.description,
    category: pgProduct.category,
    productType: pgProduct.product_type,
    price: pgProduct.price,
    currency: pgProduct.currency,
    dimensions: {
      depth: pgProduct.depth_cm ?? 0,
      width: pgProduct.width_cm ?? 0,
      height: pgProduct.height_cm ?? 0,
      unit: 'cm',
    },
    weight: pgProduct.weight_kg ?? 0,
    tags: pgProduct.tags,
    assemblyRequired: false, // Not in PostgreSQL schema, default to false
    inStock: pgProduct.stock_quantity > 0,
    lastUpdated: pgProduct.stock_last_checked,
    location,
    stock: {
      quantity: pgProduct.stock_quantity,
      lastChecked: pgProduct.stock_last_checked,
    },
    imageUrl: pgProduct.image_url ?? undefined,
    hasPendingChanges: false,
  };
}

/**
 * Parse location string to UI location format
 * Handles formats like "A-12-3" or "LIVING_ROOM"
 */
function parseLocation(locationString: string): { aisle: string; bay: string; section: string } {
  const hyphenParts = locationString.split('-');
  if (hyphenParts.length === 3) {
    return {
      aisle: hyphenParts[0].trim(),
      bay: hyphenParts[1].trim(),
      section: hyphenParts[2].trim(),
    };
  }

  // Default: treat as zone/area name
  return {
    aisle: locationString,
    bay: 'N/A',
    section: 'N/A',
  };
}

/**
 * Transform array of PostgresProducts to Products
 */
function postgresProductsToProducts(pgProducts: PostgresProduct[]): Product[] {
  return pgProducts.map(postgresProductToProduct);
}

interface UsePostgresProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch products from PostgreSQL backend
 *
 * @param searchTerm - Optional search term for filtering
 * @param category - Optional category filter
 * @param zone - Optional zone filter
 * @returns Products, loading state, error, and offline status
 */
export function usePostgresProducts(
  searchTerm?: string,
  category?: string,
  zone?: string
): UsePostgresProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      try {
        const pgProducts = await fetchProducts({
          search: searchTerm,
          category,
          zone,
        });

        if (!cancelled) {
          const transformedProducts = postgresProductsToProducts(pgProducts);
          setProducts(transformedProducts);
          setError(null);
          setIsOffline(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof PostgresAPIError) {
            setError(err.message);
            setIsOffline(err.isOffline);
            // Keep existing products on error to show stale/cached data
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

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, category, zone, refetchTrigger]);

  return {
    products,
    loading,
    error,
    isOffline,
    refetch,
  };
}

interface UsePostgresProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch a single product by article number
 *
 * @param articleNumber - The IKEA article number (e.g., "123.456.78")
 * @returns Product, loading state, error, and offline status
 */
export function usePostgresProduct(
  articleNumber: string | undefined
): UsePostgresProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!articleNumber) {
      setProduct(null);
      setLoading(false);
      setError(null);
      setIsOffline(false);
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      try {
        // TypeScript guard - articleNumber is guaranteed to be defined here due to check above
        const pgProduct = await fetchProduct(articleNumber!);

        if (!cancelled) {
          const transformedProduct = postgresProductToProduct(pgProduct);
          setProduct(transformedProduct);
          setError(null);
          setIsOffline(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof PostgresAPIError) {
            setError(err.message);
            setIsOffline(err.isOffline);

            // Handle 404 gracefully - not found is not an error state
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

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [articleNumber, refetchTrigger]);

  return {
    product,
    loading,
    error,
    isOffline,
    refetch,
  };
}

interface UsePostgresUpdateStockResult {
  updateStock: (articleNumber: string, quantity: number) => Promise<void>;
  updating: boolean;
  error: string | null;
}

/**
 * Hook to update product stock in PostgreSQL backend
 *
 * Note: This directly updates the database and does NOT support offline queueing.
 * For offline support, use the Couchbase hooks instead.
 *
 * @returns Update function, updating state, and error
 */
export function usePostgresUpdateStock(): UsePostgresUpdateStockResult {
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateStock = useCallback(async (articleNumber: string, quantity: number) => {
    setUpdating(true);
    setError(null);

    try {
      await updateStock(articleNumber, quantity);
      // Success - no need to do anything, the caller can refetch if needed
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stock';
      setError(errorMessage);
      console.error('Error updating stock:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    updateStock: handleUpdateStock,
    updating,
    error,
  };
}
