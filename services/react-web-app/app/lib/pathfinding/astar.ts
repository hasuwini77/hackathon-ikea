/**
 * A* Pathfinding Algorithm (Multi-Floor Enhanced)
 *
 * Finds the shortest path between two points in the store graph
 * with support for:
 * - Multiple floors with escalators, elevators, and stairs
 * - Accessibility mode (elevator-only vertical transitions)
 * - Preference for stairs over elevators (speed optimization)
 */

import type { Graph, Node, PathResult, Direction, NavigationOptions, EdgeType } from './types';

/**
 * Priority Queue implementation for A*
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number) {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Calculate Euclidean distance between two nodes (heuristic for A*)
 * Includes floor difference penalty for more accurate estimation
 */
function heuristic(a: Node, b: Node): number {
  const horizontalDist = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  const floorDiff = Math.abs(b.floor - a.floor);

  // Add floor penalty (assume ~20 units per floor for vertical travel)
  const floorPenalty = floorDiff * 20;

  return horizontalDist + floorPenalty;
}

/**
 * Check if an edge is allowed based on navigation options
 */
function isEdgeAllowed(edge: any, options?: NavigationOptions): boolean {
  if (!options?.accessibilityMode) {
    return true; // All edges allowed in normal mode
  }

  // In accessibility mode, only allow elevators for floor changes
  if (edge.floorChange) {
    return edge.type === 'elevator';
  }

  return true; // Allow all horizontal movement
}

/**
 * A* pathfinding algorithm with multi-floor support
 * Returns the shortest path from start to end
 */
export function findPath(
  graph: Graph,
  startId: string,
  endId: string,
  options?: NavigationOptions
): PathResult | null {
  const startNode = graph.nodes.get(startId);
  const endNode = graph.nodes.get(endId);

  if (!startNode || !endNode) {
    return null;
  }

  // Special case: start and end are the same
  if (startId === endId) {
    return {
      path: [startNode],
      distance: 0,
      directions: [
        {
          step: 1,
          instruction: `You are already at ${startNode.label || startNode.id}`,
          from: startNode,
          to: startNode,
          distance: 0,
          type: 'walk' as EdgeType,
        },
      ],
      floors: [startNode.floor],
    };
  }

  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  // Initialize scores
  graph.nodes.forEach((_, id) => {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  });

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startNode, endNode));
  openSet.enqueue(startId, fScore.get(startId)!);

  while (!openSet.isEmpty()) {
    const currentId = openSet.dequeue()!;

    // Found the goal
    if (currentId === endId) {
      return reconstructPath(graph, cameFrom, currentId, startNode, endNode);
    }

    const currentNode = graph.nodes.get(currentId)!;
    const neighbors = graph.edges.get(currentId) || [];

    for (const edge of neighbors) {
      // Skip edges that are not allowed based on navigation options
      if (!isEdgeAllowed(edge, options)) {
        continue;
      }

      const neighborId = edge.to;
      const tentativeGScore = gScore.get(currentId)! + edge.weight;

      if (tentativeGScore < gScore.get(neighborId)!) {
        // This path is better than any previous one
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeGScore);

        const neighborNode = graph.nodes.get(neighborId)!;
        fScore.set(neighborId, tentativeGScore + heuristic(neighborNode, endNode));

        openSet.enqueue(neighborId, fScore.get(neighborId)!);
      }
    }
  }

  // No path found
  return null;
}

/**
 * Reconstruct the path from the cameFrom map
 */
function reconstructPath(
  graph: Graph,
  cameFrom: Map<string, string>,
  currentId: string,
  startNode: Node,
  endNode: Node
): PathResult {
  const path: Node[] = [];
  let current = currentId;

  while (current) {
    const node = graph.nodes.get(current)!;
    path.unshift(node);
    const prev = cameFrom.get(current);
    if (!prev) break;
    current = prev;
  }

  // Calculate total distance and find edges
  let totalDistance = 0;
  const pathEdges: any[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    // Find the edge between these nodes
    const edges = graph.edges.get(from.id) || [];
    const edge = edges.find((e) => e.to === to.id);

    if (edge) {
      totalDistance += edge.weight;
      pathEdges.push(edge);
    }
  }

  // Generate turn-by-turn directions with floor awareness
  const directions = generateDirections(path, pathEdges, graph);

  // Get unique floors visited
  const floorSet = new Set(path.map((node) => node.floor));
  const floors = Array.from(floorSet).sort();

  return { path, distance: Math.round(totalDistance), directions, floors };
}

/**
 * Generate human-readable turn-by-turn directions with floor awareness
 */
function generateDirections(path: Node[], pathEdges: any[], graph: Graph): Direction[] {
  if (path.length === 0) return [];
  if (path.length === 1) {
    return [
      {
        step: 1,
        instruction: `You are at ${path[0].label || path[0].id} (Floor ${path[0].floor})`,
        from: path[0],
        to: path[0],
        distance: 0,
        type: 'walk' as EdgeType,
      },
    ];
  }

  const directions: Direction[] = [];
  let stepNumber = 1;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edge = pathEdges[i];

    if (!edge) continue;

    let instruction = '';
    const isLastStep = i === path.length - 2;
    const floorChange = edge.floorChange;

    // Generate instruction based on edge type and context
    if (i === 0) {
      instruction = `Start at ${from.label || from.id}`;
      if (from.floor) {
        instruction += ` (Floor ${from.floor})`;
      }
    } else if (floorChange) {
      // Floor transition
      instruction = getFloorTransitionInstruction(from, to, edge.type);
    } else if (isLastStep) {
      instruction = `Arrive at ${to.label || to.id}`;
    } else {
      // Regular walking direction
      const direction = getCardinalDirection(from, to);
      instruction = `Head ${direction} to ${to.label || to.id}`;
    }

    directions.push({
      step: stepNumber++,
      instruction,
      from,
      to,
      distance: Math.round(edge.weight),
      floorChange,
      type: edge.type,
    });
  }

  return directions;
}

/**
 * Get floor transition instruction based on transition type
 */
function getFloorTransitionInstruction(from: Node, to: Node, type: EdgeType): string {
  const direction = to.floor > from.floor ? 'up' : 'down';
  const toFloorName = getFloorName(to.floor);

  if (type === 'escalator') {
    return `Take escalator ${direction} to ${toFloorName}`;
  } else if (type === 'elevator') {
    return `Take elevator to ${toFloorName}`;
  } else if (type === 'stairs') {
    return `Take stairs ${direction} to ${toFloorName}`;
  }

  return `Go to ${toFloorName}`;
}

/**
 * Get floor name from floor number
 */
function getFloorName(floor: number): string {
  switch (floor) {
    case 1:
      return 'Floor 1 (Showroom)';
    case 2:
      return 'Floor 2 (Market Hall)';
    case 3:
      return 'Floor 3 (Warehouse)';
    default:
      return `Floor ${floor}`;
  }
}

/**
 * Get cardinal direction from one node to another
 */
function getCardinalDirection(from: Node, to: Node): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Convert angle to cardinal direction
  if (angle >= -22.5 && angle < 22.5) return 'east';
  if (angle >= 22.5 && angle < 67.5) return 'southeast';
  if (angle >= 67.5 && angle < 112.5) return 'south';
  if (angle >= 112.5 && angle < 157.5) return 'southwest';
  if (angle >= 157.5 || angle < -157.5) return 'west';
  if (angle >= -157.5 && angle < -112.5) return 'northwest';
  if (angle >= -112.5 && angle < -67.5) return 'north';
  if (angle >= -67.5 && angle < -22.5) return 'northeast';

  return 'forward';
}

/**
 * Find path including a product location that might not be in the graph
 */
export function findPathToProduct(
  graph: Graph,
  startId: string,
  productNode: Node,
  options?: NavigationOptions
): PathResult | null {
  // Find the closest node in the graph to the product (on the same floor)
  let closestNodeId = '';
  let minDistance = Infinity;

  graph.nodes.forEach((node, id) => {
    // Only consider nodes on the same floor as the product
    if (node.floor !== productNode.floor) return;

    const dist = heuristic(node, productNode);
    if (dist < minDistance) {
      minDistance = dist;
      closestNodeId = id;
    }
  });

  if (!closestNodeId) return null;

  // Find path to the closest node
  const pathToNode = findPath(graph, startId, closestNodeId, options);
  if (!pathToNode) return null;

  // Add the product location as the final destination
  const closestNode = graph.nodes.get(closestNodeId)!;
  const finalDistance = heuristic(closestNode, productNode);

  // Ensure floors list includes product floor
  const floorSet = new Set([...pathToNode.floors, productNode.floor]);
  const floors = Array.from(floorSet).sort();

  return {
    path: [...pathToNode.path, productNode],
    distance: pathToNode.distance + Math.round(finalDistance),
    directions: [
      ...pathToNode.directions,
      {
        step: pathToNode.directions.length + 1,
        instruction: `Product is located at ${productNode.label || productNode.id}`,
        from: closestNode,
        to: productNode,
        distance: Math.round(finalDistance),
        type: 'walk' as EdgeType,
      },
    ],
    floors,
  };
}
