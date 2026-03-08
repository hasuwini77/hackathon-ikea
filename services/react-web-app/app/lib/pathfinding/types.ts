/**
 * Pathfinding Types
 *
 * Data structures for store navigation and pathfinding with multi-floor support
 */

/**
 * Node types in the navigation graph
 */
export type NodeType =
  | 'aisle'
  | 'escalator_up'
  | 'escalator_down'
  | 'elevator'
  | 'stairs'
  | 'entrance'
  | 'exit'
  | 'junction';

/**
 * Edge types representing different movement modes
 */
export type EdgeType = 'walk' | 'escalator' | 'elevator' | 'stairs';

/**
 * Floor change information for vertical transitions
 */
export interface FloorChange {
  from: number;
  to: number;
}

/**
 * A node in the navigation graph (enhanced with floor support)
 */
export interface Node {
  id: string;
  floor: number;  // 1, 2, or 3
  x: number;
  y: number;
  type: NodeType;
  label?: string;
}

/**
 * Legacy Point interface for backward compatibility
 */
export interface Point {
  x: number;
  y: number;
  id: string;
  label?: string;
  floor?: number;  // Optional for backward compatibility
}

/**
 * An edge in the navigation graph (enhanced with floor transitions)
 */
export interface Edge {
  from: string;
  to: string;
  weight: number;  // Time/distance cost
  type: EdgeType;
  floorChange?: FloorChange;
}

/**
 * Navigation graph structure
 */
export interface Graph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge[]>;
}

/**
 * Navigation options
 */
export interface NavigationOptions {
  accessibilityMode?: boolean;  // If true, prefer elevators over stairs/escalators
  preferStairs?: boolean;        // If true, prefer stairs over escalators when going down
}

/**
 * Path result including multi-floor directions
 */
export interface PathResult {
  path: Node[];
  distance: number;
  directions: Direction[];
  floors: number[];  // List of floors visited in order
}

/**
 * Turn-by-turn direction with floor awareness
 */
export interface Direction {
  step: number;
  instruction: string;
  from: Node;
  to: Node;
  distance: number;
  floorChange?: FloorChange;
  type: EdgeType;
}

/**
 * Location specification
 */
export interface Location {
  zone: string;
  floor?: number;    // 1, 2, or 3
  aisle?: number;
  bay?: number;
  section?: string;
}

/**
 * Floor information
 */
export interface FloorInfo {
  number: number;
  name: string;
  description: string;
}
