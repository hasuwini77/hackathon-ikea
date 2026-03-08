# Pathfinding System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          RealisticStoreMap Component                   │  │
│  │  - Product Selection Panel                            │  │
│  │  - Start Location Picker                              │  │
│  │  - Visual Path Overlay (SVG)                          │  │
│  │  - Directions Panel                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Navigation Hook Layer                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              useNavigation Hook                       │  │
│  │  - State Management (start, end, path, error)        │  │
│  │  - startNavigation(from, to)                          │  │
│  │  - clearNavigation()                                  │  │
│  │  - setStartLocation(location)                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Pathfinding Core Layer                     │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   graph.ts       │  │    astar.ts      │                │
│  │                  │  │                  │                │
│  │ buildStoreGraph()│  │ findPath()       │                │
│  │ getNodeForLoc()  │  │ findPathToProd() │                │
│  │ getProductCoord()│  │ Priority Queue   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Graph Data Structure                     │  │
│  │  Nodes: Map<string, Point>                            │  │
│  │  Edges: Map<string, Edge[]>                           │  │
│  │  40+ waypoints, 60+ bidirectional paths              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action: "Navigate to BILLY bookcase"
        │
        ├─→ Click product in list
        │
        ├─→ Select "Store Entrance" as start
        │
        ▼
useNavigation.startNavigation({
  from: { zone: 'entrance' },
  to: { zone: 'warehouse', aisle: 25, bay: 3, section: 'A' }
})
        │
        ├─→ buildStoreGraph() [memoized]
        │
        ├─→ getNodeForLocation(graph, 'entrance')
        │       └─→ Returns: Point { id: 'entrance', x: 600, y: 775 }
        │
        ├─→ getProductCoordinates('warehouse', 25, 3, 'A')
        │       └─→ Returns: Point { x: 395, y: 606 }
        │
        ├─→ findPathToProduct(graph, 'entrance', productPoint)
        │       │
        │       ├─→ Find closest graph node to product
        │       ├─→ Run A* from entrance to warehouse-aisle-25
        │       └─→ Append product point to path
        │
        ▼
PathResult {
  path: [
    Point { id: 'entrance', x: 600, y: 775 },
    Point { id: 'entrance-to-showroom', x: 600, y: 720 },
    Point { id: 'showroom-start', x: 500, y: 650 },
    ...
    Point { id: 'warehouse-aisle-25', x: 395, y: 620 },
    Point { id: 'product-...', x: 395, y: 606 }
  ],
  distance: 487,
  directions: [
    { step: 1, instruction: "Start at Store Entrance", ... },
    { step: 2, instruction: "Head north to Entry Hall", ... },
    ...
    { step: 7, instruction: "Arrive at Aisle 25, Bay 3, Section A", ... }
  ]
}
        │
        ▼
RealisticStoreMap renders:
  - Yellow dashed polyline through path points
  - Green "A" marker at start
  - Red "B" marker at destination
  - Directions panel with step-by-step instructions
```

## Graph Structure

```
Store Layout (1200x800 coordinate system):

    0,0 ────────────────────────────────────────── 1200,0
     │                                                │
     │   ┌─────────────────┐  ┌──────────────┐      │
     │   │   SHOWROOM      │  │  RESTAURANT  │      │
     │   │                 │  └──────────────┘      │
     │   │  living-room-1  │                        │
     │   │       ↓         │                        │
     │   │  bedroom-1      │  ┌──────────────┐      │
     │   │       ↓         │  │              │      │
     │   │  kitchen-1      │  │ MARKET HALL  │      │
     │   │                 │  │              │      │
     │   └─────────────────┘  │  textiles-1  │      │
     │                        │      ↓       │      │
     │   ┌─────────────────┐  │  cookshop-1  │      │
     │   │    CHECKOUT     │  │      ↓       │      │
     │   └─────────────────┘  │  lighting-1  │      │
     │                        └──────────────┘      │
     │                                              │
     │   ┌──────────────────────────────────────┐  │
     │   │         WAREHOUSE (Aisles 21-30)     │  │
     │   │  [21] [22] [23] [24] [25] [26] ...   │  │
     │   │   ↕    ↕    ↕    ↕    ↕    ↕          │  │
     │   └──────────────────────────────────────┘  │
     │                                              │
     │               ┌──────────┐                   │
     │               │ ENTRANCE │                   │
    0,800 ──────────────────────────────────────── 1200,800
```

## A* Algorithm Flow

```
1. Initialize:
   openSet = PriorityQueue()
   gScore[start] = 0
   fScore[start] = heuristic(start, goal)

2. While openSet not empty:
   current = openSet.dequeue()

   if current == goal:
     return reconstructPath()

   for each neighbor of current:
     tentativeG = gScore[current] + distance(current, neighbor)

     if tentativeG < gScore[neighbor]:
       cameFrom[neighbor] = current
       gScore[neighbor] = tentativeG
       fScore[neighbor] = tentativeG + heuristic(neighbor, goal)
       openSet.enqueue(neighbor, fScore[neighbor])

3. Return path not found

Heuristic: Euclidean distance
  h(n) = √((x₂-x₁)² + (y₂-y₁)²)

Complexity: O(E log V) where E=edges, V=vertices
```

## Component Interaction

```
┌────────────────────┐
│   User Clicks      │
│   Product          │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐     ┌──────────────────┐
│ setSelectedProduct │────▶│ Show Location    │
│ (product)          │     │ Picker Modal     │
└────────────────────┘     └─────┬────────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │ User Selects     │
                          │ Start Location   │
                          └─────┬────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────┐
│ navigation.startNavigation(from, to)        │
│   ├─→ buildGraph()                          │
│   ├─→ getNodes()                            │
│   ├─→ findPath()                            │
│   └─→ setPathResult()                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│ React re-renders with pathResult           │
│   ├─→ SVG <polyline> for path             │
│   ├─→ Start/End markers                   │
│   ├─→ Directions panel                    │
│   └─→ Distance calculation                │
└────────────────────────────────────────────┘
```

## Node Types

```
1. Entry/Exit Points:
   - entrance (600, 775)
   - exit (250, 735)

2. Showroom Nodes:
   - living-room-1, living-room-2
   - bedroom-1, bedroom-2
   - kitchen-1
   - dining-1
   - childrens-1

3. Market Hall Nodes:
   - market-entrance
   - textiles-1
   - cookshop-1
   - lighting-1
   - organization-1

4. Warehouse Nodes:
   - warehouse-entrance
   - warehouse-aisle-21 through warehouse-aisle-30

5. Service Nodes:
   - checkout
   - showroom-start
   - entrance-to-showroom
```

## Edge Weights

Edges are weighted by Euclidean distance:

```javascript
distance = √((x₂-x₁)² + (y₂-y₁)²)

Example:
  entrance (600, 775) → entrance-to-showroom (600, 720)
  distance = √((600-600)² + (720-775)²)
          = √(0 + 3025)
          = 55 units
```

## Performance Optimization

1. **Graph Memoization**
   ```typescript
   const graph = useMemo(() => buildStoreGraph(), []);
   ```

2. **Priority Queue**
   - Uses sorted array for O(log n) insertion
   - Faster than naive O(n) scanning

3. **Early Termination**
   - A* stops as soon as goal is reached
   - Doesn't explore entire graph

4. **Path Caching**
   - PathResult stored in state
   - Only recalculated on new navigation

## Error Handling

```
User Action
    │
    ▼
Try {
    getNodeForLocation()
    ↓
    Node found? ──No──→ setError("Location not found")
    ↓ Yes
    findPath()
    ↓
    Path found? ──No──→ setError("No path available")
    ↓ Yes
    setPathResult()
}
Catch (error) {
    setError(error.message)
}
```

## Location Resolution

```
Input: { zone: 'warehouse', aisle: 25, bay: 3, section: 'A' }
    │
    ├─→ Is specific product location? (has bay/section)
    │   Yes → getProductCoordinates()
    │           └─→ Calculate exact coordinates
    │               baseX = 80 + ((25-21) * 105) = 500
    │               bayY = 540 + (3 * 22) = 606
    │               sectionX = baseX + offset[A] = 515
    │               Return: Point(515, 606)
    │
    └─→ Is general location?
        Yes → getNodeForLocation()
                └─→ Match to closest graph node
                    warehouse-aisle-25
                    Return: Point(125, 620)
```

## Visual Rendering

```
SVG Layers (z-index):
    │
    ├─→ Background (floor)
    ├─→ Zone rectangles
    ├─→ Aisle markers
    ├─→ Product dots
    ├─→ Navigation path ◄── Added by this implementation
    │   ├─→ <polyline> (yellow dashed)
    │   ├─→ Start marker (green circle "A")
    │   ├─→ End marker (red circle "B")
    │   └─→ Waypoint dots (blue)
    └─→ Tooltips
```

This architecture provides a scalable, performant navigation system that can be extended with additional features like multi-stop routing, real-time updates, and accessibility modes.
