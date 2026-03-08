/**
 * React hook to fetch products at a specific store location
 * Queries products matching the given aisle, bay, and optional section
 */

import { useState, useEffect, useMemo } from 'react';
import { getAllDocuments } from '~/lib/couchbase/client';
import { productDocumentsToProducts } from '~/lib/couchbase/transforms';
import type { ProductDocument } from '~/lib/couchbase/types';
import type { Product } from '~/types/product';
import type { MapLocation } from '../types';

export interface UseProductsInLocationResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch products at a specific warehouse location
 *
 * @param location - Map location with aisle, bay, and optional section
 * @returns Products at the location, loading state, and error
 *
 * @example
 * ```tsx
 * const location = { aisle: 5, bay: 3, section: 'A' };
 * const { products, loading, error } = useProductsInLocation(location);
 *
 * if (loading) return <div>Loading products...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return <div>Found {products.length} products</div>;
 * ```
 */
export function useProductsInLocation(
  location: MapLocation | null
): UseProductsInLocationResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create stable location key for dependency tracking
  const locationKey = useMemo(() => {
    if (!location) return null;
    return `${location.aisle}-${location.bay}-${location.section || ''}`;
  }, [location]);

  useEffect(() => {
    // If no location is provided, clear products and return
    if (!location) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    // Capture location in scope for use in async function
    const searchLocation = location;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all documents from Couchbase
        const allDocs = await getAllDocuments(true);

        // Filter and transform products that match the location
        const matchingProducts = allDocs.rows
          .filter((row) => row.doc)
          .map((row) => row.doc as ProductDocument)
          .filter((doc) => {
            // Check if stock has location property (handle both number and object formats)
            if (typeof doc.stock !== 'object' || !('location' in doc.stock)) {
              // If stock is a number or doesn't have location, try to match using top-level fields
              if (doc.aisle !== undefined && doc.bay !== undefined) {
                const aisleMatch = Number(doc.aisle) === searchLocation.aisle;
                const bayMatch = Number(doc.bay) === searchLocation.bay;
                const sectionMatch = !searchLocation.section ||
                  searchLocation.section === '' ||
                  (doc.section && doc.section.toUpperCase() === searchLocation.section.toUpperCase());
                return aisleMatch && bayMatch && sectionMatch;
              }
              return false;
            }

            // Parse the stock location string (e.g., "5-3-A" or "LIVING_ROOM")
            const stockLocation = doc.stock.location;

            // Try to parse hyphen-separated format (e.g., "5-3-A")
            const parts = stockLocation.split('-');
            if (parts.length >= 2) {
              const aisle = parseInt(parts[0].trim(), 10);
              const bay = parseInt(parts[1].trim(), 10);
              const section = parts[2]?.trim().toUpperCase() || '';

              // Match aisle and bay (required)
              const aisleMatch = aisle === searchLocation.aisle;
              const bayMatch = bay === searchLocation.bay;

              // If section is provided in the search location, match it too
              const sectionMatch = !searchLocation.section ||
                searchLocation.section === '' ||
                section === searchLocation.section.toUpperCase();

              return aisleMatch && bayMatch && sectionMatch;
            }

            // If the location string doesn't match expected format, exclude it
            return false;
          });

        // Transform ProductDocuments to UI Products
        const transformedProducts = productDocumentsToProducts(matchingProducts);

        if (!cancelled) {
          setProducts(transformedProducts);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch products'
          );
          setProducts([]); // Clear products on error
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [locationKey]);

  return {
    products,
    loading,
    error,
  };
}
