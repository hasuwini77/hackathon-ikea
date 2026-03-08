/**
 * Central state management for store map interactions
 * Manages zoom level, highlighted locations, and selected aisles
 */

import { useState, useCallback, useEffect } from 'react';
import type { MapLocation } from '../types';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1.0;

export interface UseMapStateResult {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  highlightedLocation: MapLocation | null;
  setHighlightedLocation: (loc: MapLocation | null) => void;
  clearHighlight: () => void;

  selectedAisle: number | null;
  setSelectedAisle: (aisle: number | null) => void;
}

/**
 * Hook for managing store map state including zoom, highlights, and selections
 *
 * @param initialLocation - Optional initial location to highlight (e.g., from URL params)
 * @returns Map state and control functions
 *
 * @example
 * ```tsx
 * const urlLocation = useLocationFromUrl();
 * const mapState = useMapState(urlLocation);
 *
 * // Control zoom
 * <button onClick={mapState.zoomIn}>Zoom In</button>
 * <button onClick={mapState.zoomOut}>Zoom Out</button>
 *
 * // Highlight a location
 * mapState.setHighlightedLocation({ aisle: 5, bay: 3, section: 'A' });
 * ```
 */
export function useMapState(initialLocation?: MapLocation | null): UseMapStateResult {
  // Zoom state
  const [zoom, setZoomState] = useState<number>(ZOOM_DEFAULT);

  // Location highlight state
  const [highlightedLocation, setHighlightedLocation] = useState<MapLocation | null>(
    initialLocation ?? null
  );

  // Selected aisle state
  const [selectedAisle, setSelectedAisle] = useState<number | null>(null);

  // Keep highlight in sync with URL/prop updates after initial mount.
  useEffect(() => {
    setHighlightedLocation(initialLocation ?? null);
  }, [initialLocation?.aisle, initialLocation?.bay, initialLocation?.section]);

  /**
   * Set zoom level with bounds checking
   */
  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    setZoomState(clampedZoom);
  }, []);

  /**
   * Zoom in by one step
   */
  const zoomIn = useCallback(() => {
    setZoom(zoom + ZOOM_STEP);
  }, [zoom, setZoom]);

  /**
   * Zoom out by one step
   */
  const zoomOut = useCallback(() => {
    setZoom(zoom - ZOOM_STEP);
  }, [zoom, setZoom]);

  /**
   * Reset zoom to default level
   */
  const resetZoom = useCallback(() => {
    setZoomState(ZOOM_DEFAULT);
  }, []);

  /**
   * Clear highlighted location
   */
  const clearHighlight = useCallback(() => {
    setHighlightedLocation(null);
  }, []);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    highlightedLocation,
    setHighlightedLocation,
    clearHighlight,
    selectedAisle,
    setSelectedAisle,
  };
}
