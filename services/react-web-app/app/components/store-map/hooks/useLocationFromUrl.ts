/**
 * Parse location from URL search parameters
 * Reads ?aisle=5&bay=3&section=A from the current URL
 */

import { useSearchParams } from 'react-router';
import type { MapLocation } from '../types';

/**
 * Hook to extract and validate location from URL search parameters
 *
 * @returns MapLocation if valid params exist, null otherwise
 *
 * @example
 * ```tsx
 * // URL: /store-map?aisle=5&bay=3&section=A
 * const location = useLocationFromUrl();
 * // Returns: { aisle: 5, bay: 3, section: 'A' }
 *
 * // URL: /store-map?aisle=5&bay=3
 * const location = useLocationFromUrl();
 * // Returns: { aisle: 5, bay: 3, section: '' }
 *
 * // URL: /store-map
 * const location = useLocationFromUrl();
 * // Returns: null
 * ```
 */
export function useLocationFromUrl(): MapLocation | null {
  const [searchParams] = useSearchParams();

  const aisleParam = searchParams.get('aisle');
  const bayParam = searchParams.get('bay');
  const sectionParam = searchParams.get('section');

  // Require at least aisle and bay to be present
  if (!aisleParam || !bayParam) {
    return null;
  }

  const aisle = parseInt(aisleParam, 10);
  const bay = parseInt(bayParam, 10);

  // Validate that aisle and bay are valid numbers
  if (isNaN(aisle) || isNaN(bay)) {
    return null;
  }

  // Basic range validation (aisle 1-30, bay 1-10)
  if (aisle < 1 || aisle > 30 || bay < 1 || bay > 10) {
    return null;
  }

  // Section is optional, but if provided should be A-D
  const section = sectionParam || '';
  if (section && !['A', 'B', 'C', 'D'].includes(section.toUpperCase())) {
    return null;
  }

  return {
    aisle,
    bay,
    section: section.toUpperCase(),
  };
}
