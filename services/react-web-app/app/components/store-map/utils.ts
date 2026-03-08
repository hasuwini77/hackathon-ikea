import type { MapLocation, StoreZone } from './types';
import { STORE_LAYOUT } from './config';

/**
 * Parse location string "5-3-A" to MapLocation
 * Format: aisle-bay-section
 * @param locationString - Location string in format "aisle-bay-section"
 * @returns MapLocation object or null if invalid
 */
export function parseLocation(locationString: string): MapLocation | null {
  if (!locationString || typeof locationString !== 'string') {
    return null;
  }

  const parts = locationString.trim().split('-');

  if (parts.length !== 3) {
    return null;
  }

  const [aisleStr, bayStr, section] = parts;

  const aisle = parseInt(aisleStr, 10);
  const bay = parseInt(bayStr, 10);

  // Validate aisle number
  if (isNaN(aisle) || aisle < 1 || aisle > STORE_LAYOUT.totalAisles) {
    return null;
  }

  // Validate bay number
  if (isNaN(bay) || bay < 1 || bay > STORE_LAYOUT.baysPerAisle) {
    return null;
  }

  // Validate section
  if (!STORE_LAYOUT.sections.includes(section.toUpperCase())) {
    return null;
  }

  return {
    aisle,
    bay,
    section: section.toUpperCase()
  };
}

/**
 * Get zone for an aisle number
 * @param aisle - Aisle number
 * @returns StoreZone or undefined if not found
 */
export function getZoneForAisle(aisle: number): StoreZone | undefined {
  return STORE_LAYOUT.zones.find(
    zone => aisle >= zone.startAisle && aisle <= zone.endAisle
  );
}

/**
 * Format location for display
 * @param location - MapLocation object
 * @returns Formatted string "Aisle 5, Bay 3, Section A"
 */
export function formatLocation(location: MapLocation): string {
  return `Aisle ${location.aisle}, Bay ${location.bay}, Section ${location.section}`;
}

/**
 * Check if two locations match
 * @param a - First location
 * @param b - Second location
 * @returns true if locations match exactly
 */
export function locationsMatch(a: MapLocation, b: MapLocation): boolean {
  return (
    a.aisle === b.aisle &&
    a.bay === b.bay &&
    a.section.toUpperCase() === b.section.toUpperCase()
  );
}
