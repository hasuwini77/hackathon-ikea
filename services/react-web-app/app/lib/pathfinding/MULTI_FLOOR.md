# Multi-Floor Navigation System

## Overview

The IKEA store pathfinding system now supports multi-floor navigation with intelligent routing across three floors using escalators, elevators, and stairs.

## Store Layout

### Floor 1: Showroom (Ground Floor)
- **Entrance**: Main store entrance
- **Living Room**: Sofas, coffee tables, entertainment units
- **Bedroom**: Beds, wardrobes, nightstands
- **Kitchen**: Cabinets, appliances
- **Dining**: Tables, chairs
- **Children's Room**: Kids furniture and decor
- **Checkout & Exit**: Payment and store exit

### Floor 2: Market Hall
- **Textiles & Rugs**: Curtains, pillows, carpets
- **Cookshop**: Kitchenware, utensils, small appliances
- **Lighting**: Lamps, bulbs, lighting fixtures
- **Home Organization**: Storage boxes, hangers, organizers
- **Plants & Decor**: Artificial plants, vases, decorative items

### Floor 3: Warehouse (Self-Serve)
- **Aisles 21-30**: Self-service warehouse with flat-pack furniture
- Each aisle has 10 bays
- Each bay has 4 sections (A, B, C, D)
- Pick up items using aisle/bay/section codes

## Vertical Transitions

### Escalators (One-Way, Fast)
- **Floor 1 → Floor 2**: Escalator up (weight: 15)
- **Floor 2 → Floor 1**: Escalator down (weight: 15)
- **Floor 2 → Floor 3**: Escalator up (weight: 15)
- **Floor 3 → Floor 2**: Escalator down (weight: 15)

### Elevators (Bidirectional, Accessible)
- Connects all three floors
- Slower than escalators/stairs (weight: 30)
- **Accessible**: Required in accessibility mode
- Can skip floors (e.g., Floor 1 → Floor 3 directly)

### Stairs (Bidirectional, Medium Speed)
- Connects all three floors
- Faster than elevators (weight: 20)
- Can skip floors
- Good for able-bodied shoppers

## Usage Examples

### Basic Multi-Floor Navigation

```typescript
import { useNavigation } from '~/lib/pathfinding';

function NavigationComponent() {
  const navigation = useNavigation();

  const navigateToWarehouse = () => {
    navigation.startNavigation(
      { zone: 'entrance', floor: 1 }, // Start at entrance (Floor 1)
      { zone: 'warehouse', floor: 3, aisle: 25 } // Navigate to Warehouse (Floor 3)
    );
  };

  return (
    <div>
      <button onClick={navigateToWarehouse}>Navigate to Warehouse</button>
      {navigation.pathResult && (
        <div>
          <h3>Route: {navigation.pathResult.floors.length} floors</h3>
          <p>Floors visited: {navigation.pathResult.floors.join(' → ')}</p>
          <p>Total distance: {navigation.pathResult.distance} units</p>
        </div>
      )}
    </div>
  );
}
```

### Accessibility Mode (Elevator Only)

```typescript
import { useNavigation } from '~/lib/pathfinding';

function AccessibleNavigation() {
  const navigation = useNavigation();

  const navigateAccessible = () => {
    navigation.startNavigation(
      { zone: 'entrance', floor: 1 },
      { zone: 'warehouse', floor: 3, aisle: 25 },
      { accessibilityMode: true } // Forces elevator usage
    );
  };

  return (
    <div>
      <button onClick={navigateAccessible}>
        Accessible Route (Elevator Only)
      </button>
    </div>
  );
}
```

### Floor-by-Floor Directions

```typescript
import { useNavigation, useFloorDirections } from '~/lib/pathfinding';

function DirectionsPanel() {
  const navigation = useNavigation();
  const floorGroups = useFloorDirections(navigation.pathResult);

  return (
    <div>
      {floorGroups.map((group) => (
        <div key={group.floor}>
          <h3>{group.floorName}</h3>
          <ol>
            {group.directions.map((dir) => (
              <li key={dir.step}>
                {dir.instruction}
                {dir.floorChange && (
                  <span> 🔼 Floor Change: {dir.floorChange.from} → {dir.floorChange.to}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
```

### Navigate to Specific Product

```typescript
import { useNavigation } from '~/lib/pathfinding';

function ProductNavigation() {
  const navigation = useNavigation();

  const navigateToBilly = () => {
    // BILLY bookcase at Warehouse Aisle 25, Bay 3, Section A
    navigation.startNavigation(
      { zone: 'entrance', floor: 1 },
      {
        zone: 'warehouse',
        floor: 3,
        aisle: 25,
        bay: 3,
        section: 'A'
      }
    );
  };

  return (
    <div>
      <button onClick={navigateToBilly}>
        Navigate to BILLY Bookcase
      </button>
    </div>
  );
}
```

## Navigation Options

### `NavigationOptions` Interface

```typescript
interface NavigationOptions {
  accessibilityMode?: boolean;  // Use elevators only for floor changes
  preferStairs?: boolean;        // Prefer stairs over escalators when going down
}
```

### Accessibility Mode
When `accessibilityMode: true`:
- Only elevators are used for floor transitions
- Escalators and stairs are excluded from the route
- Ensures wheelchair and mobility-device accessibility

### Prefer Stairs
When `preferStairs: true`:
- Stairs are preferred over escalators for vertical movement
- Faster than elevators
- Good for fitness-conscious shoppers

## Direction Types

### Floor Transition Instructions

The system automatically generates appropriate instructions for floor changes:

```typescript
// Escalator instructions
"Take escalator up to Floor 2 (Market Hall)"
"Take escalator down to Floor 1 (Showroom)"

// Elevator instructions
"Take elevator to Floor 3 (Warehouse)"

// Stairs instructions
"Take stairs up to Floor 2 (Market Hall)"
"Take stairs down to Floor 1 (Showroom)"
```

### Regular Walking Instructions

```typescript
"Start at Store Entrance (Floor 1)"
"Head north to Entry Hall"
"Head east to Showroom Start"
"Arrive at Warehouse Aisle 25"
```

## API Reference

### Updated Types

#### `Node` Interface
```typescript
interface Node {
  id: string;
  floor: number;        // 1, 2, or 3
  x: number;
  y: number;
  type: NodeType;       // 'aisle' | 'escalator_up' | 'escalator_down' | 'elevator' | 'stairs' | 'entrance' | 'exit' | 'junction'
  label?: string;
}
```

#### `Edge` Interface
```typescript
interface Edge {
  from: string;
  to: string;
  weight: number;       // Travel cost (distance or time)
  type: EdgeType;       // 'walk' | 'escalator' | 'elevator' | 'stairs'
  floorChange?: {
    from: number;
    to: number;
  };
}
```

#### `PathResult` Interface
```typescript
interface PathResult {
  path: Node[];
  distance: number;
  directions: Direction[];
  floors: number[];     // Unique floors visited in order
}
```

#### `Direction` Interface
```typescript
interface Direction {
  step: number;
  instruction: string;
  from: Node;
  to: Node;
  distance: number;
  floorChange?: FloorChange;
  type: EdgeType;
}
```

### Updated Functions

#### `findPath()`
```typescript
function findPath(
  graph: Graph,
  startId: string,
  endId: string,
  options?: NavigationOptions
): PathResult | null
```

#### `findPathToProduct()`
```typescript
function findPathToProduct(
  graph: Graph,
  startId: string,
  productNode: Node,
  options?: NavigationOptions
): PathResult | null
```

#### `getNodeForLocation()`
```typescript
function getNodeForLocation(
  graph: Graph,
  zone: string,
  floor?: number,
  aisle?: number,
  bay?: number
): Node | null
```

#### `getProductCoordinates()`
```typescript
function getProductCoordinates(
  zone: string,
  floor?: number,
  aisle?: number,
  bay?: number,
  section?: string
): Node
```

## Algorithm Enhancements

### Multi-Floor Heuristic

The A* heuristic now includes floor difference:

```typescript
function heuristic(a: Node, b: Node): number {
  const horizontalDist = Math.sqrt((b.x - a.x)² + (b.y - a.y)²);
  const floorDiff = Math.abs(b.floor - a.floor);
  const floorPenalty = floorDiff * 20;
  return horizontalDist + floorPenalty;
}
```

### Edge Filtering

In accessibility mode, only elevator edges are allowed for floor changes:

```typescript
function isEdgeAllowed(edge: Edge, options?: NavigationOptions): boolean {
  if (options?.accessibilityMode && edge.floorChange) {
    return edge.type === 'elevator';
  }
  return true;
}
```

### Edge Weights

Different transition types have different weights:

| Type | Weight | Description |
|------|--------|-------------|
| Walk | Distance | Euclidean distance between nodes |
| Escalator | 15 | Fast, one-way vertical transition |
| Stairs | 20 | Medium speed, bidirectional |
| Elevator | 30 | Slow but accessible, all floors |

## Performance

- **Graph size**: ~70 nodes, ~120 edges (with multi-floor support)
- **Average pathfinding**: <15ms (including floor transitions)
- **Memory usage**: ~50KB for graph structure
- **Complexity**: O(E log V) where E = edges, V = vertices

## Testing Multi-Floor Navigation

```typescript
import { buildStoreGraph, findPath, getNodeForLocation } from '~/lib/pathfinding';

// Test 1: Floor 1 to Floor 3 (normal mode)
const graph = buildStoreGraph();
const start = getNodeForLocation(graph, 'entrance', 1);
const end = getNodeForLocation(graph, 'warehouse', 3, 25);
const result = findPath(graph, start.id, end.id);

console.log('Floors visited:', result.floors); // [1, 2, 3] or [1, 3]
console.log('Distance:', result.distance);

// Test 2: Accessibility mode
const accessibleResult = findPath(
  graph,
  start.id,
  end.id,
  { accessibilityMode: true }
);

console.log('Accessible route uses elevator only');
accessibleResult.directions.forEach(dir => {
  if (dir.floorChange) {
    console.log('Transition type:', dir.type); // Should be 'elevator'
  }
});
```

## Migration Guide

### From Single-Floor to Multi-Floor

**Old Code:**
```typescript
const startNode = getNodeForLocation(graph, 'entrance');
const endNode = getNodeForLocation(graph, 'warehouse', 25);
const result = findPath(graph, startNode.id, endNode.id);
```

**New Code:**
```typescript
const startNode = getNodeForLocation(graph, 'entrance', 1); // Add floor
const endNode = getNodeForLocation(graph, 'warehouse', 3, 25); // Add floor
const result = findPath(graph, startNode.id, endNode.id, { accessibilityMode: false });
```

### Backward Compatibility

The system provides `getNodeForLocationLegacy()` for backward compatibility:

```typescript
// Works with old signature (no floor parameter)
const node = getNodeForLocationLegacy(graph, 'warehouse', 25);
// Returns Floor 3 warehouse node (inferred from zone)
```

## Future Enhancements

- [ ] Real-time elevator wait time estimation
- [ ] Crowd-based route optimization (avoid busy escalators)
- [ ] Multi-stop optimization (shopping list route)
- [ ] Voice guidance for floor transitions
- [ ] AR overlays showing escalator/elevator locations
- [ ] Dynamic rerouting if elevators are out of service

## License

Part of the IKEA Offline-First PWA project.
