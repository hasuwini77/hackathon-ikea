/**
 * React hook to fetch products filtered by zone
 *
 * This hook fetches products from Couchbase and filters them by zone
 * based on their aisle location. Supports postgres fallback (future).
 */

import { useMemo } from 'react';
import { useProducts as useCouchbaseProducts } from '~/lib/couchbase';
import { productDocumentsToProducts } from '~/lib/couchbase/transforms';
import type { Product } from '~/types/product';

export interface UseProductsByZoneResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}

type NormalizedZone = 'showroom' | 'market' | 'warehouse';

/**
 * Map aisle number to zone name
 */
function getZoneFromAisle(aisle: number): NormalizedZone {
  // Fallback heuristic when explicit zone metadata is missing.
  if (aisle <= 15) return 'showroom';
  if (aisle <= 35) return 'market';
  return 'warehouse';
}

function normalizeZone(rawZone?: string): NormalizedZone | null {
  if (!rawZone) return null;
  const zone = rawZone.toLowerCase();
  if (zone.includes('showroom')) return 'showroom';
  if (zone.includes('market')) return 'market';
  if (zone.includes('warehouse')) return 'warehouse';
  return null;
}

export function getProductZone(product: Product): NormalizedZone {
  const explicitZone = normalizeZone(product.location.zone);
  if (explicitZone) {
    return explicitZone;
  }

  const aisleNum = parseInt(product.location.aisle, 10);
  if (isNaN(aisleNum)) {
    return 'warehouse';
  }

  return getZoneFromAisle(aisleNum);
}

/**
 * Hook to fetch products filtered by zone
 *
 * @param zone - Zone filter ('showroom', 'market', 'warehouse', or null for all)
 * @returns Products in the zone, loading state, and error
 *
 * @example
 * ```tsx
 * const { products, loading, error } = useProductsByZone('warehouse');
 * if (loading) return <div>Loading...</div>;
 * return <div>Found {products.length} warehouse products</div>;
 * ```
 */
export function useProductsByZone(
  zone: string | null
): UseProductsByZoneResult {
  // Fetch all products from Couchbase
  const { products: productDocs, loading, error } = useCouchbaseProducts();

  // Transform and filter products
  const products = useMemo(() => {
    // Transform to UI format
    const uiProducts = productDocumentsToProducts(productDocs);

    // If no zone filter, return all products
    if (!zone) {
      return uiProducts;
    }

    // Filter by zone
    return uiProducts.filter((product) => getProductZone(product) === zone);
  }, [productDocs, zone]);

  return {
    products,
    loading,
    error,
  };
}
