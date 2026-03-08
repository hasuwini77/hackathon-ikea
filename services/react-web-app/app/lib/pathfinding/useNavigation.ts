/**
 * useNavigation Hook (Multi-Floor Enhanced)
 *
 * React hook for calculating navigation paths and directions
 * with multi-floor support and accessibility options
 */

import { useState, useEffect, useMemo } from 'react';
import { buildStoreGraph, getNodeForLocation, getProductCoordinates } from './graph';
import { findPath, findPathToProduct } from './astar';
import type { PathResult, Location, NavigationOptions } from './types';

export interface NavigationState {
  isNavigating: boolean;
  pathResult: PathResult | null;
  error: string | null;
  startLocation: Location | null;
  endLocation: Location | null;
  options: NavigationOptions;
}

export interface UseNavigationReturn extends NavigationState {
  startNavigation: (from: Location, to: Location, options?: NavigationOptions) => void;
  clearNavigation: () => void;
  setStartLocation: (location: Location | null) => void;
  setOptions: (options: NavigationOptions) => void;
}

/**
 * Hook for managing multi-floor store navigation
 */
export function useNavigation(): UseNavigationReturn {
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<NavigationOptions>({
    accessibilityMode: false,
    preferStairs: false,
  });

  // Build the graph once
  const graph = useMemo(() => buildStoreGraph(), []);

  const isNavigating = pathResult !== null;

  const startNavigation = (from: Location, to: Location, navOptions?: NavigationOptions) => {
    setError(null);
    setStartLocation(from);
    setEndLocation(to);

    // Merge options
    const mergedOptions = { ...options, ...navOptions };
    if (navOptions) {
      setOptions(mergedOptions);
    }

    try {
      // Get the start node
      const startNode = getNodeForLocation(
        graph,
        from.zone,
        from.floor,
        from.aisle,
        from.bay
      );
      if (!startNode) {
        setError(`Could not find start location: ${from.zone}`);
        return;
      }

      // Check if end location is a product with specific bay/section
      if (to.bay !== undefined || to.section !== undefined) {
        // Navigate to specific product location
        const productNode = getProductCoordinates(
          to.zone,
          to.floor,
          to.aisle,
          to.bay,
          to.section
        );
        const result = findPathToProduct(graph, startNode.id, productNode, mergedOptions);

        if (!result) {
          setError('Could not find a path to the product');
          return;
        }

        setPathResult(result);
      } else {
        // Navigate to general zone/aisle
        const endNode = getNodeForLocation(graph, to.zone, to.floor, to.aisle, to.bay);
        if (!endNode) {
          setError(`Could not find destination: ${to.zone}`);
          return;
        }

        const result = findPath(graph, startNode.id, endNode.id, mergedOptions);
        if (!result) {
          setError('Could not find a path to the destination');
          return;
        }

        setPathResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while calculating the path');
      setPathResult(null);
    }
  };

  const clearNavigation = () => {
    setPathResult(null);
    setError(null);
    setEndLocation(null);
  };

  return {
    isNavigating,
    pathResult,
    error,
    startLocation,
    endLocation,
    options,
    startNavigation,
    clearNavigation,
    setStartLocation,
    setOptions,
  };
}

/**
 * Helper hook to get available start locations (multi-floor)
 */
export function useStartLocations(): Array<{ id: string; label: string; location: Location }> {
  return [
    {
      id: 'entrance',
      label: 'Store Entrance (Floor 1)',
      location: { zone: 'entrance', floor: 1 },
    },
    {
      id: 'showroom-start',
      label: 'Showroom Start (Floor 1)',
      location: { zone: 'showroom', floor: 1, aisle: 1 },
    },
    {
      id: 'market-entrance',
      label: 'Market Hall (Floor 2)',
      location: { zone: 'market', floor: 2, aisle: 11 },
    },
    {
      id: 'warehouse-entrance',
      label: 'Warehouse (Floor 3)',
      location: { zone: 'warehouse', floor: 3, aisle: 21 },
    },
    {
      id: 'checkout',
      label: 'Checkout Area (Floor 1)',
      location: { zone: 'checkout', floor: 1 },
    },
  ];
}

/**
 * Helper hook to get floor-by-floor breakdown of directions
 */
export function useFloorDirections(pathResult: PathResult | null) {
  if (!pathResult) return [];

  const floorGroups: Array<{
    floor: number;
    floorName: string;
    directions: typeof pathResult.directions;
  }> = [];

  let currentFloor = pathResult.path[0]?.floor;
  let currentGroup: typeof pathResult.directions = [];

  pathResult.directions.forEach((direction) => {
    if (direction.from.floor !== currentFloor) {
      // Floor changed, save current group
      if (currentGroup.length > 0) {
        floorGroups.push({
          floor: currentFloor,
          floorName: getFloorName(currentFloor),
          directions: currentGroup,
        });
      }
      currentFloor = direction.from.floor;
      currentGroup = [];
    }
    currentGroup.push(direction);
  });

  // Add the last group
  if (currentGroup.length > 0) {
    floorGroups.push({
      floor: currentFloor,
      floorName: getFloorName(currentFloor),
      directions: currentGroup,
    });
  }

  return floorGroups;
}

/**
 * Get floor name helper
 */
function getFloorName(floor: number): string {
  switch (floor) {
    case 1:
      return 'Floor 1 - Showroom';
    case 2:
      return 'Floor 2 - Market Hall';
    case 3:
      return 'Floor 3 - Warehouse';
    default:
      return `Floor ${floor}`;
  }
}
