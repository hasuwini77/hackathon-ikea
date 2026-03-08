/**
 * Store Graph Builder (Multi-Floor)
 *
 * Creates a graph representation of the IKEA store with multi-floor support:
 * - Floor 1: Entrance, Showroom (Living room, Bedroom, etc.)
 * - Floor 2: Market Hall (Kitchen, Dining, Textiles, Plants)
 * - Floor 3: Self-serve Warehouse (all furniture pickup)
 * - Vertical transitions: Escalators, Elevators, Stairs
 *
 * Based on the RealisticStoreMap layout (1200x800 viewBox)
 */

import type { Node, Edge, Graph, FloorInfo, Point } from './types';

/**
 * Floor information
 */
export const FLOORS: FloorInfo[] = [
  { number: 1, name: 'Ground Floor', description: 'Entrance & Showroom' },
  { number: 2, name: 'Second Floor', description: 'Market Hall' },
  { number: 3, name: 'Third Floor', description: 'Self-Serve Warehouse' },
];

/**
 * Build the complete multi-floor store navigation graph
 * This represents all walkable paths and vertical transitions in the store
 */
export function buildStoreGraph(): Graph {
  const nodes = new Map<string, Node>();
  const edges = new Map<string, Edge[]>();

  // Helper to add a node with floor support
  const addNode = (
    id: string,
    floor: number,
    x: number,
    y: number,
    type: Node['type'] = 'aisle',
    label?: string
  ) => {
    nodes.set(id, { id, floor, x, y, type, label });
  };

  // Helper to add a bidirectional edge
  const addEdge = (from: string, to: string, type: Edge['type'] = 'walk') => {
    const fromNode = nodes.get(from);
    const toNode = nodes.get(to);
    if (!fromNode || !toNode) return;

    const distance = Math.sqrt(
      Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2)
    );

    // Base weight is distance, but modified by edge type
    let weight = distance;
    let floorChange = undefined;

    // Check for floor change
    if (fromNode.floor !== toNode.floor) {
      floorChange = { from: fromNode.floor, to: toNode.floor };

      // Adjust weights based on transition type
      if (type === 'escalator') {
        weight = 15; // Fast vertical transition
      } else if (type === 'elevator') {
        weight = 30; // Slower but accessible
      } else if (type === 'stairs') {
        weight = 20; // Medium speed
      }
    }

    // Add edge from -> to
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from)!.push({ from, to, weight, type, floorChange });

    // Add edge to -> from (bidirectional)
    if (!edges.has(to)) edges.set(to, []);
    edges.get(to)!.push({ from: to, to: from, weight, type, floorChange });
  };

  // Helper to add a one-way edge (for escalators)
  const addOneWayEdge = (from: string, to: string, type: Edge['type'] = 'walk') => {
    const fromNode = nodes.get(from);
    const toNode = nodes.get(to);
    if (!fromNode || !toNode) return;

    const distance = Math.sqrt(
      Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2)
    );

    let weight = distance;
    let floorChange = undefined;

    if (fromNode.floor !== toNode.floor) {
      floorChange = { from: fromNode.floor, to: toNode.floor };
      weight = type === 'escalator' ? 15 : weight;
    }

    // Add edge only from -> to (one-way)
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from)!.push({ from, to, weight, type, floorChange });
  };

  // =========================
  // FLOOR 1: ENTRANCE & SHOWROOM
  // =========================

  // ENTRANCE (Floor 1)
  addNode('entrance', 1, 600, 775, 'entrance', 'Store Entrance');
  addNode('entrance-hall', 1, 600, 720, 'junction', 'Entry Hall');

  // SHOWROOM SECTION (Floor 1) - Living Room Area
  addNode('showroom-start', 1, 500, 650, 'junction', 'Showroom Start');
  addNode('living-room-1', 1, 150, 130, 'aisle', 'Living Room - Sofas');
  addNode('living-room-2', 1, 200, 130, 'aisle', 'Living Room - Coffee Tables');

  // SHOWROOM - Bedroom Area (Floor 1)
  addNode('bedroom-1', 1, 330, 250, 'aisle', 'Bedroom - Beds');
  addNode('bedroom-2', 1, 330, 280, 'aisle', 'Bedroom - Wardrobes');

  // SHOWROOM - Kitchen Area (Floor 1)
  addNode('kitchen-1', 1, 150, 345, 'aisle', 'Kitchen - Cabinets');

  // SHOWROOM - Dining Area (Floor 1)
  addNode('dining-1', 1, 475, 130, 'aisle', 'Dining - Tables');

  // SHOWROOM - Children's Area (Floor 1)
  addNode('childrens-1', 1, 475, 305, 'aisle', "Children's Room");

  // Transition area on Floor 1
  addNode('floor1-transition', 1, 600, 500, 'junction', 'Floor 1 Transition Hub');

  // =========================
  // FLOOR 2: MARKET HALL
  // =========================

  addNode('floor2-entrance', 2, 600, 500, 'junction', 'Floor 2 Entrance');
  addNode('textiles-1', 2, 740, 295, 'aisle', 'Textiles & Rugs');
  addNode('cookshop-1', 2, 1000, 295, 'aisle', 'Cookshop');
  addNode('lighting-1', 2, 740, 425, 'aisle', 'Lighting');
  addNode('organization-1', 2, 1000, 425, 'aisle', 'Home Organization');
  addNode('plants-1', 2, 870, 360, 'aisle', 'Plants & Decor');

  // Transition area on Floor 2
  addNode('floor2-transition', 2, 600, 520, 'junction', 'Floor 2 Transition Hub');

  // =========================
  // FLOOR 3: WAREHOUSE
  // =========================

  addNode('floor3-entrance', 3, 600, 520, 'junction', 'Warehouse Floor Entrance');

  // Warehouse aisles (21-30) on Floor 3
  for (let i = 0; i < 10; i++) {
    const aisleNum = 21 + i;
    const x = 125 + (i * 105);
    const y = 620;
    addNode(`warehouse-aisle-${aisleNum}`, 3, x, y, 'aisle', `Aisle ${aisleNum}`);
  }

  // Warehouse exit area (Floor 3)
  addNode('warehouse-exit', 3, 600, 700, 'junction', 'Warehouse Exit');

  // =========================
  // VERTICAL TRANSITIONS
  // =========================

  // Escalators Floor 1 -> 2 (one-way up)
  addNode('escalator-1-2-up-bottom', 1, 580, 500, 'escalator_up', 'Escalator to Floor 2 (Up)');
  addNode('escalator-1-2-up-top', 2, 580, 500, 'escalator_up', 'Escalator from Floor 1');

  // Escalators Floor 2 -> 1 (one-way down)
  addNode('escalator-2-1-down-top', 2, 620, 500, 'escalator_down', 'Escalator to Floor 1 (Down)');
  addNode('escalator-2-1-down-bottom', 1, 620, 500, 'escalator_down', 'Escalator from Floor 2');

  // Escalators Floor 2 -> 3 (one-way up)
  addNode('escalator-2-3-up-bottom', 2, 580, 520, 'escalator_up', 'Escalator to Floor 3 (Up)');
  addNode('escalator-2-3-up-top', 3, 580, 520, 'escalator_up', 'Escalator from Floor 2');

  // Escalators Floor 3 -> 2 (one-way down)
  addNode('escalator-3-2-down-top', 3, 620, 520, 'escalator_down', 'Escalator to Floor 2 (Down)');
  addNode('escalator-3-2-down-bottom', 2, 620, 520, 'escalator_down', 'Escalator from Floor 3');

  // Elevator (connects all floors, accessible)
  addNode('elevator-floor-1', 1, 650, 510, 'elevator', 'Elevator (Floor 1)');
  addNode('elevator-floor-2', 2, 650, 510, 'elevator', 'Elevator (Floor 2)');
  addNode('elevator-floor-3', 3, 650, 510, 'elevator', 'Elevator (Floor 3)');

  // Stairs (bidirectional, faster than elevator)
  addNode('stairs-floor-1', 1, 550, 510, 'stairs', 'Stairs (Floor 1)');
  addNode('stairs-floor-2', 2, 550, 510, 'stairs', 'Stairs (Floor 2)');
  addNode('stairs-floor-3', 3, 550, 510, 'stairs', 'Stairs (Floor 3)');

  // =========================
  // CHECKOUT & EXIT (Floor 1)
  // =========================

  addNode('checkout', 1, 175, 460, 'junction', 'Checkout');
  addNode('exit', 1, 250, 735, 'exit', 'Store Exit');

  // =========================
  // FLOOR 1 HORIZONTAL EDGES
  // =========================

  // Entrance connections
  addEdge('entrance', 'entrance-hall', 'walk');
  addEdge('entrance-hall', 'showroom-start', 'walk');

  // Showroom flow (the IKEA maze path)
  addEdge('showroom-start', 'living-room-1', 'walk');
  addEdge('living-room-1', 'living-room-2', 'walk');
  addEdge('living-room-2', 'dining-1', 'walk');
  addEdge('living-room-2', 'bedroom-1', 'walk');
  addEdge('bedroom-1', 'bedroom-2', 'walk');
  addEdge('bedroom-2', 'childrens-1', 'walk');
  addEdge('bedroom-2', 'kitchen-1', 'walk');
  addEdge('childrens-1', 'dining-1', 'walk');

  // Showroom to transition area
  addEdge('kitchen-1', 'checkout', 'walk');
  addEdge('childrens-1', 'floor1-transition', 'walk');
  addEdge('dining-1', 'floor1-transition', 'walk');

  // Floor 1 transition area connections
  addEdge('floor1-transition', 'escalator-1-2-up-bottom', 'walk');
  addEdge('floor1-transition', 'escalator-2-1-down-bottom', 'walk');
  addEdge('floor1-transition', 'elevator-floor-1', 'walk');
  addEdge('floor1-transition', 'stairs-floor-1', 'walk');

  // Checkout and exit
  addEdge('checkout', 'exit', 'walk');

  // =========================
  // FLOOR 2 HORIZONTAL EDGES
  // =========================

  // Floor 2 entrance area
  addEdge('floor2-entrance', 'textiles-1', 'walk');
  addEdge('floor2-entrance', 'lighting-1', 'walk');

  // Market Hall connections
  addEdge('textiles-1', 'cookshop-1', 'walk');
  addEdge('textiles-1', 'plants-1', 'walk');
  addEdge('textiles-1', 'lighting-1', 'walk');
  addEdge('cookshop-1', 'organization-1', 'walk');
  addEdge('cookshop-1', 'plants-1', 'walk');
  addEdge('lighting-1', 'organization-1', 'walk');
  addEdge('lighting-1', 'plants-1', 'walk');
  addEdge('plants-1', 'organization-1', 'walk');

  // Market Hall to transition area
  addEdge('organization-1', 'floor2-transition', 'walk');
  addEdge('lighting-1', 'floor2-transition', 'walk');
  addEdge('floor2-entrance', 'floor2-transition', 'walk');

  // Floor 2 transition area connections
  addEdge('floor2-transition', 'escalator-2-3-up-bottom', 'walk');
  addEdge('floor2-transition', 'escalator-3-2-down-bottom', 'walk');
  addEdge('floor2-transition', 'elevator-floor-2', 'walk');
  addEdge('floor2-transition', 'stairs-floor-2', 'walk');
  addEdge('floor2-transition', 'escalator-1-2-up-top', 'walk');
  addEdge('floor2-transition', 'escalator-2-1-down-top', 'walk');
  addEdge('floor2-entrance', 'escalator-1-2-up-top', 'walk');
  addEdge('floor2-entrance', 'escalator-2-1-down-top', 'walk');

  // =========================
  // FLOOR 3 HORIZONTAL EDGES
  // =========================

  // Floor 3 entrance area
  addEdge('floor3-entrance', 'warehouse-aisle-21', 'walk');
  addEdge('floor3-entrance', 'warehouse-aisle-25', 'walk');

  // Floor 3 transition area connections
  addEdge('floor3-entrance', 'escalator-2-3-up-top', 'walk');
  addEdge('floor3-entrance', 'escalator-3-2-down-top', 'walk');
  addEdge('floor3-entrance', 'elevator-floor-3', 'walk');
  addEdge('floor3-entrance', 'stairs-floor-3', 'walk');

  // Warehouse aisles - connect in sequence
  for (let i = 21; i < 30; i++) {
    addEdge(`warehouse-aisle-${i}`, `warehouse-aisle-${i + 1}`, 'walk');
  }

  // Warehouse to exit
  addEdge('warehouse-aisle-30', 'warehouse-exit', 'walk');
  addEdge('warehouse-aisle-25', 'warehouse-exit', 'walk');

  // =========================
  // VERTICAL TRANSITIONS
  // =========================

  // Escalators Floor 1 -> 2 (one-way up only)
  addOneWayEdge('escalator-1-2-up-bottom', 'escalator-1-2-up-top', 'escalator');

  // Escalators Floor 2 -> 1 (one-way down only)
  addOneWayEdge('escalator-2-1-down-top', 'escalator-2-1-down-bottom', 'escalator');

  // Escalators Floor 2 -> 3 (one-way up only)
  addOneWayEdge('escalator-2-3-up-bottom', 'escalator-2-3-up-top', 'escalator');

  // Escalators Floor 3 -> 2 (one-way down only)
  addOneWayEdge('escalator-3-2-down-top', 'escalator-3-2-down-bottom', 'escalator');

  // Elevator (bidirectional, connects all floors)
  addEdge('elevator-floor-1', 'elevator-floor-2', 'elevator');
  addEdge('elevator-floor-2', 'elevator-floor-3', 'elevator');
  addEdge('elevator-floor-1', 'elevator-floor-3', 'elevator');

  // Stairs (bidirectional, all floors)
  addEdge('stairs-floor-1', 'stairs-floor-2', 'stairs');
  addEdge('stairs-floor-2', 'stairs-floor-3', 'stairs');
  addEdge('stairs-floor-1', 'stairs-floor-3', 'stairs');

  return { nodes, edges };
}

/**
 * Get the closest graph node to a given location (with floor support)
 */
export function getNodeForLocation(
  graph: Graph,
  zone: string,
  floor?: number,
  aisle?: number,
  bay?: number
): Node | null {
  // Special case: entrance (Floor 1)
  if (zone === 'entrance' || zone === 'entry') {
    return graph.nodes.get('entrance') || null;
  }

  // Special case: exit (Floor 1)
  if (zone === 'exit') {
    return graph.nodes.get('exit') || null;
  }

  // Special case: checkout (Floor 1)
  if (zone === 'checkout') {
    return graph.nodes.get('checkout') || null;
  }

  // Showroom zones (aisles 1-10) - Floor 1
  if (zone === 'showroom') {
    if (aisle !== undefined) {
      if (aisle >= 1 && aisle <= 3) {
        return graph.nodes.get('living-room-1') || null;
      }
      if (aisle >= 4 && aisle <= 6) {
        return graph.nodes.get('bedroom-1') || null;
      }
      if (aisle >= 7 && aisle <= 8) {
        return graph.nodes.get('kitchen-1') || null;
      }
      if (aisle === 9) {
        return graph.nodes.get('dining-1') || null;
      }
      if (aisle === 10) {
        return graph.nodes.get('childrens-1') || null;
      }
    }
    return graph.nodes.get('living-room-1') || null;
  }

  // Market hall zones (aisles 11-20) - Floor 2
  if (zone === 'market' || zone === 'market-hall') {
    if (aisle !== undefined) {
      if (aisle >= 11 && aisle <= 13) {
        return graph.nodes.get('textiles-1') || null;
      }
      if (aisle >= 14 && aisle <= 16) {
        return graph.nodes.get('cookshop-1') || null;
      }
      if (aisle >= 17 && aisle <= 18) {
        return graph.nodes.get('lighting-1') || null;
      }
      if (aisle >= 19 && aisle <= 20) {
        return graph.nodes.get('organization-1') || null;
      }
    }
    return graph.nodes.get('textiles-1') || null;
  }

  // Warehouse (aisles 21-30) - Floor 3
  if (zone === 'warehouse') {
    if (aisle !== undefined && aisle >= 21 && aisle <= 30) {
      return graph.nodes.get(`warehouse-aisle-${aisle}`) || null;
    }
    return graph.nodes.get('floor3-entrance') || null;
  }

  // If floor is specified, try to find a transition node
  if (floor !== undefined) {
    if (floor === 1) {
      return graph.nodes.get('floor1-transition') || null;
    }
    if (floor === 2) {
      return graph.nodes.get('floor2-entrance') || null;
    }
    if (floor === 3) {
      return graph.nodes.get('floor3-entrance') || null;
    }
  }

  // Default: return entrance
  return graph.nodes.get('entrance') || null;
}

/**
 * Backward compatibility: getNodeForLocation with old signature
 */
export function getNodeForLocationLegacy(
  graph: Graph,
  zone: string,
  aisle?: number,
  bay?: number
): Node | null {
  return getNodeForLocation(graph, zone, undefined, aisle, bay);
}

/**
 * Get coordinates for a specific product location (with floor support)
 * This calculates the exact position within an aisle/bay/section
 */
export function getProductCoordinates(
  zone: string,
  floor?: number,
  aisle?: number,
  bay?: number,
  section?: string
): Node {
  // For warehouse aisles (Floor 3), calculate precise position
  if (zone === 'warehouse' && aisle !== undefined && aisle >= 21 && aisle <= 30) {
    const baseX = 80 + ((aisle - 21) * 105);
    const baseY = 540;

    // Add bay offset (vertical)
    const bayY = bay !== undefined ? baseY + (bay * 22) : baseY + 50;

    // Add section offset (horizontal within bay)
    let sectionX = baseX + 45; // center by default
    if (section === 'A') sectionX = baseX + 15;
    if (section === 'B') sectionX = baseX + 35;
    if (section === 'C') sectionX = baseX + 55;
    if (section === 'D') sectionX = baseX + 75;

    return {
      id: `product-${zone}-${aisle}-${bay}-${section}`,
      floor: 3,
      x: sectionX,
      y: bayY,
      type: 'aisle',
      label: `Warehouse Aisle ${aisle}, Bay ${bay}, Section ${section}`,
    };
  }

  // For other zones, use the closest node
  const graph = buildStoreGraph();
  const node = getNodeForLocation(graph, zone, floor, aisle, bay);
  return node || {
    id: 'entrance',
    floor: 1,
    x: 600,
    y: 775,
    type: 'entrance' as const,
    label: 'Store Entrance',
  };
}

/**
 * Get all available floors
 */
export function getFloors(): FloorInfo[] {
  return FLOORS;
}

/**
 * Convert Node to Point for backward compatibility
 */
export function nodeToPoint(node: Node): Point {
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    label: node.label,
    floor: node.floor,
  };
}
