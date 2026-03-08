/**
 * Pathfinding Module (Multi-Floor Enhanced)
 *
 * Public API for store navigation and wayfinding with multi-floor support
 */

// Graph building and node utilities
export {
  buildStoreGraph,
  getNodeForLocation,
  getNodeForLocationLegacy,
  getProductCoordinates,
  getFloors,
  nodeToPoint,
  FLOORS,
} from './graph';

// Pathfinding algorithms
export { findPath, findPathToProduct } from './astar';

// React hooks
export { useNavigation, useStartLocations, useFloorDirections } from './useNavigation';

// Type exports
export type {
  Node,
  Point,
  Edge,
  Graph,
  PathResult,
  Direction,
  Location,
  NodeType,
  EdgeType,
  FloorChange,
  FloorInfo,
  NavigationOptions,
} from './types';

export type { NavigationState, UseNavigationReturn } from './useNavigation';
