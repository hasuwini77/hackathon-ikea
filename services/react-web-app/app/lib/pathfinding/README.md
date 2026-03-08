# IKEA Store Pathfinding Module

A complete wayfinding and navigation system for the IKEA store map, providing shortest-path routing and turn-by-turn directions with **multi-floor support**.

## Features

- **Multi-Floor Navigation**: Navigate across 3 floors with escalators, elevators, and stairs
- **Graph-based Navigation**: Store layout represented as a connected graph of walkable paths
- **A* Pathfinding Algorithm**: Optimal shortest-path calculation using A* with Euclidean heuristic
- **Accessibility Mode**: Elevator-only routing for wheelchair and mobility-device users
- **Product Location Support**: Navigate to specific products with aisle, bay, and section precision
- **Floor-aware Directions**: Instructions like "Take escalator up to Floor 2 (Market Hall)"
- **React Hook Integration**: Easy-to-use `useNavigation` hook with accessibility options
- **Visual Path Overlay**: SVG polyline rendering with start/end markers

## Quick Links

- **Multi-Floor Guide**: [Multi-Floor Documentation](./MULTI_FLOOR.md)
- **Quick Start**: [Multi-Floor Quick Start](./MULTI_FLOOR_QUICKSTART.md)
- **Architecture**: [System Architecture](./ARCHITECTURE.md)

## Architecture

### Core Modules

1. **graph.ts** - Store graph representation
   - `buildStoreGraph()`: Creates the navigation graph with all walkable paths
   - `getNodeForLocation()`: Maps zones/aisles to graph nodes
   - `getProductCoordinates()`: Calculates exact product positions

2. **astar.ts** - Pathfinding algorithm
   - `findPath()`: A* algorithm for shortest path between nodes
   - `findPathToProduct()`: Navigate to products not in the main graph

3. **types.ts** - TypeScript interfaces
   - `Graph`, `Point`, `Edge`: Graph data structures
   - `PathResult`, `Direction`: Navigation results
   - `Location`: Store location specification

4. **useNavigation.ts** - React hook
   - Navigation state management
   - Path calculation
   - Start location presets

## Usage

### Basic Navigation Hook

```tsx
import { useNavigation, useStartLocations } from '~/lib/pathfinding/useNavigation';

function StoreMap() {
  const navigation = useNavigation();
  const startLocations = useStartLocations();

  const handleNavigate = () => {
    navigation.startNavigation(
      { zone: 'entrance' }, // Start location
      { zone: 'warehouse', aisle: 25, bay: 3, section: 'A' } // End location
    );
  };

  return (
    <div>
      {navigation.pathResult && (
        <div>
          <h3>Directions</h3>
          {navigation.pathResult.directions.map((dir) => (
            <div key={dir.step}>
              {dir.step}. {dir.instruction}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Direct API Usage

```typescript
import { buildStoreGraph, getNodeForLocation, findPath } from '~/lib/pathfinding';

// Build the graph
const graph = buildStoreGraph();

// Find path from entrance to warehouse aisle 25
const startNode = getNodeForLocation(graph, 'entrance');
const endNode = getNodeForLocation(graph, 'warehouse', 25);

if (startNode && endNode) {
  const result = findPath(graph, startNode.id, endNode.id);

  if (result) {
    console.log(`Distance: ${result.distance}`);
    console.log(`Path:`, result.path.map(p => p.label).join(' → '));
    result.directions.forEach(dir => {
      console.log(`${dir.step}. ${dir.instruction}`);
    });
  }
}
```

### Product Navigation

```typescript
import { buildStoreGraph, getProductCoordinates, findPathToProduct } from '~/lib/pathfinding';

const graph = buildStoreGraph();

// Navigate to BILLY bookcase at Warehouse Aisle 15, Bay 3, Section A
const productPoint = getProductCoordinates('warehouse', 15, 3, 'A');
const result = findPathToProduct(graph, 'entrance', productPoint);

if (result) {
  console.log('Turn-by-turn directions:', result.directions);
}
```

## Store Layout

The graph represents the IKEA store with these zones:

### Showroom (Aisles 1-10)
- Living Room (Aisles 1-3)
- Bedroom (Aisles 4-6)
- Kitchen (Aisles 7-8)
- Dining (Aisle 9)
- Children's Room (Aisle 10)

### Market Hall (Aisles 11-20)
- Textiles (Aisles 11-13)
- Cookshop (Aisles 14-16)
- Lighting (Aisles 17-18)
- Organization (Aisles 19-20)

### Warehouse (Aisles 21-30)
- Self-service warehouse with numbered aisles
- Each aisle has 10 bays
- Each bay has 4 sections (A, B, C, D)

### Service Areas
- Entrance
- Checkout
- Exit
- Restaurant (display only)

## Graph Structure

The navigation graph contains:
- **40+ nodes**: Major walkway intersections and zone centers
- **Bidirectional edges**: All paths can be traversed both ways
- **Weighted edges**: Distance-based weights for optimal routing
- **Connected components**: All navigable areas are reachable

## Coordinate System

- SVG ViewBox: 1200 x 800
- Origin: Top-left (0, 0)
- Entrance: Bottom center (600, 775)
- All coordinates match RealisticStoreMap.tsx

## API Reference

### `buildStoreGraph(): Graph`
Constructs the complete store navigation graph.

### `getNodeForLocation(graph, zone, aisle?, bay?): Point | null`
Finds the closest graph node for a given location.

**Parameters:**
- `graph`: The store graph
- `zone`: Zone name ('entrance', 'showroom', 'market', 'warehouse', 'checkout', 'exit')
- `aisle?`: Optional aisle number
- `bay?`: Optional bay number

### `getProductCoordinates(zone, aisle?, bay?, section?): Point`
Calculates exact coordinates for a product location.

### `findPath(graph, startId, endId): PathResult | null`
Finds shortest path between two nodes using A*.

### `findPathToProduct(graph, startId, productPoint): PathResult | null`
Finds path to a specific product location.

### `useNavigation(): UseNavigationReturn`
React hook for navigation state management.

**Returns:**
- `isNavigating`: boolean
- `pathResult`: PathResult | null
- `error`: string | null
- `startLocation`: Location | null
- `endLocation`: Location | null
- `startNavigation(from, to)`: Function to start navigation
- `clearNavigation()`: Function to clear current navigation
- `setStartLocation(location)`: Function to set start location

### `useStartLocations(): StartLocation[]`
Returns predefined start location options.

## Testing

Run the test suite:

```typescript
import { runAllTests } from '~/lib/pathfinding/test-navigation';

// In browser console or test file
runAllTests();
```

Test categories:
- Location node resolution
- Basic path finding
- Product navigation
- Direction generation

## Integration with RealisticStoreMap

The `RealisticStoreMap` component now includes:

1. **Product Selection**: Click any product marker to navigate
2. **Start Location Picker**: Choose your current location
3. **Visual Path Overlay**: Animated path line with markers
4. **Directions Panel**: Step-by-step instructions
5. **Distance Calculation**: Total route length

### Expected UX Flow

1. User searches for "BILLY bookcase"
2. Product appears on map at Warehouse Aisle 15, Bay 3, Section A
3. User clicks "Navigate" button
4. Modal shows start location options
5. User selects "Store Entrance"
6. Map displays:
   - Yellow dashed path line
   - Green "A" marker at start
   - Red "B" marker at destination
   - Blue waypoint dots
7. Directions panel shows turn-by-turn instructions
8. User follows path to product

## Performance

- Graph building: O(V + E) where V=nodes, E=edges
- Pathfinding: O(E log V) with priority queue optimization
- Average path calculation: <10ms
- Graph size: ~40 nodes, ~60 edges

## Multi-Floor Navigation

The pathfinding system now supports **multi-floor navigation** with:

- **3 Floors**: Showroom (Floor 1), Market Hall (Floor 2), Warehouse (Floor 3)
- **Vertical Transitions**: Escalators (one-way), Elevators (accessible), Stairs (bidirectional)
- **Accessibility Mode**: Elevator-only routing for wheelchair users
- **Floor-aware Directions**: Instructions like "Take escalator to Floor 2"

See the [Multi-Floor Documentation](./MULTI_FLOOR.md) for complete details and [Quick Start Guide](./MULTI_FLOOR_QUICKSTART.md) for examples.

## Future Enhancements

- [ ] Multiple waypoints/stops
- [x] **Multi-floor support** (COMPLETED)
- [x] **Accessibility routing** (COMPLETED - elevator-only paths)
- [ ] Obstacle avoidance (closed aisles)
- [ ] Shopping list route optimization
- [ ] Voice-guided navigation
- [ ] Augmented reality overlay
- [ ] Real-time crowd avoidance
- [ ] Elevator wait time estimation

## License

Part of the IKEA Offline-First PWA project.
