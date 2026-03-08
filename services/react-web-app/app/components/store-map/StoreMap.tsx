/**
 * Main StoreMap Container Component
 *
 * Orchestrates all store map functionality including:
 * - Map state management (zoom, highlights)
 * - URL-based location highlighting
 * - Product display at selected locations
 * - Interactive controls and legend
 */

import { RealisticStoreMap } from './RealisticStoreMap';
import { LocationCard } from './LocationCard';
import { useMapState } from './hooks/useMapState';
import { useLocationFromUrl } from './hooks/useLocationFromUrl';
import { useProductsInLocation } from './hooks/useProductsInLocation';
import { useProductsByZone, getProductZone } from './hooks/useProductsByZone';
import type { MapLocation } from './types';
import type { Product } from '~/types/product';

export interface StoreMapProps {
  initialLocation?: MapLocation | null;
  onLocationSelect?: (location: MapLocation) => void;
  showControls?: boolean;
  showLegend?: boolean;
  zoneFilter?: string | null;
  products?: Product[];
  showProductDirectory?: boolean;
}

/**
 * StoreMap Component
 *
 * Main store map component that orchestrates zoom controls, location highlighting,
 * and product display functionality.
 *
 * Features:
 * - Zoom in/out/reset controls
 * - Zone legend showing color-coded store areas
 * - Deep linking support via URL params
 * - Interactive bay clicking with location highlighting
 * - Product display at selected locations
 * - LocationCard showing products at highlighted bay
 *
 * @param initialLocation - Optional initial location to highlight (overrides URL)
 * @param onLocationSelect - Callback when a location is clicked
 * @param showControls - Show zoom and reset controls (default: true)
 * @param showLegend - Show zone legend (default: true)
 *
 * @example
 * ```tsx
 * // Basic usage with URL-based highlighting
 * <StoreMap showControls showLegend />
 *
 * // With explicit initial location
 * <StoreMap
 *   initialLocation={{ aisle: 5, bay: 3, section: 'A' }}
 *   onLocationSelect={(loc) => console.log('Selected:', loc)}
 * />
 * ```
 */
export function StoreMap({
  initialLocation,
  onLocationSelect,
  showControls = true,
  showLegend = true,
  zoneFilter = null,
  products: productsProp,
  showProductDirectory = false,
}: StoreMapProps) {
  // Get location from URL if no initial location provided
  const urlLocation = useLocationFromUrl();
  const location = initialLocation ?? urlLocation;

  // Use map state hook for zoom and highlight management
  const {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    highlightedLocation,
    setHighlightedLocation,
  } = useMapState(location);

  // Fetch fallback products when parent does not provide them.
  const { products: fetchedProducts } = useProductsByZone(zoneFilter);

  const allProducts = productsProp ?? fetchedProducts;

  // Fetch products at the highlighted location
  const { products, loading } = useProductsInLocation(highlightedLocation);

  /**
   * Handle location click from realistic map - convert zone/aisle to MapLocation
   */
  const handleLocationClick = (location: { zone: string; aisle?: number; bay?: number }) => {
    // Convert zone-based location to MapLocation format
    const aisle = location.aisle || 1;
    const bay = location.bay || 1;
    const newLocation: MapLocation = { aisle, bay, section: 'A' };
    setHighlightedLocation(newLocation);
    onLocationSelect?.(newLocation);
  };

  /**
   * Handle location card close - clear highlighted location
   */
  const handleCloseLocationCard = () => {
    setHighlightedLocation(null);
  };

  // Convert MapLocation to zone-based location for RealisticStoreMap
  const getZoneFromAisle = (aisle: number): string => {
    if (aisle <= 15) return 'showroom';
    if (aisle <= 35) return 'market';
    return 'warehouse';
  };

  const mapAisleToVisualLane = (zone: string, aisle: number): number => {
    const showroomLanes = [1, 4, 7, 9, 10];
    const marketLanes = [11, 14, 17, 19];
    const warehouseLanes = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

    const lanes =
      zone === 'showroom'
        ? showroomLanes
        : zone === 'market'
          ? marketLanes
          : warehouseLanes;

    if (lanes.length === 0) return aisle;

    const minLane = Math.min(...lanes);
    const maxLane = Math.max(...lanes);
    if (aisle <= minLane) return minLane;
    if (aisle >= maxLane) return maxLane;

    // Snap to nearest visual lane for a stable user mental model.
    return lanes.reduce((closest, current) =>
      Math.abs(current - aisle) < Math.abs(closest - aisle) ? current : closest
    );
  };

  const highlightedZoneLocation = highlightedLocation
    ? {
        zone: zoneFilter || getZoneFromAisle(highlightedLocation.aisle),
        aisle: mapAisleToVisualLane(
          zoneFilter || getZoneFromAisle(highlightedLocation.aisle),
          highlightedLocation.aisle
        ),
        bay: highlightedLocation.bay,
      }
    : undefined;

  // Convert all products to zone-based format for RealisticStoreMap
  const productsWithZones = allProducts
    .map((product) => {
      const aisleNum = parseInt(product.location.aisle, 10);
      const bayNum = parseInt(product.location.bay, 10);

      // Skip products with invalid aisle/bay numbers
      if (isNaN(aisleNum) || isNaN(bayNum)) {
        return null;
      }

      return {
        id: product._id,
        zone: getProductZone(product),
        aisle: mapAisleToVisualLane(getProductZone(product), aisleNum),
        bay: bayNum,
        stockLevel: product.stock.quantity,
        name: product.name,
        sourceAisle: aisleNum,
        sourceBay: bayNum,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Realistic Store Map */}
      <div className="flex-1 overflow-hidden">
        <RealisticStoreMap
          highlightedLocation={highlightedZoneLocation}
          products={productsWithZones}
          onLocationClick={handleLocationClick}
          showProductDirectory={showProductDirectory}
        />
      </div>

      {/* Location Card (slides in from bottom on mobile) */}
      {highlightedLocation && (
        <LocationCard
          location={highlightedLocation}
          products={products}
          onClose={handleCloseLocationCard}
        />
      )}
    </div>
  );
}
