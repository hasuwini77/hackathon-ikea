# Navigation Quick Start Guide

Get up and running with IKEA Store Navigation in 5 minutes.

## Installation

No installation needed! The pathfinding module is already part of the project.

## Basic Usage

### 1. Import the Navigation Hook

```tsx
import { useNavigation } from '~/lib/pathfinding/useNavigation';
```

### 2. Use in Your Component

```tsx
function MyStoreMap() {
  const navigation = useNavigation();

  // Navigate from entrance to warehouse aisle 25
  const handleNavigate = () => {
    navigation.startNavigation(
      { zone: 'entrance' },
      { zone: 'warehouse', aisle: 25 }
    );
  };

  return (
    <div>
      <button onClick={handleNavigate}>Find Product</button>

      {navigation.pathResult && (
        <div>
          <h3>Directions:</h3>
          {navigation.pathResult.directions.map((dir) => (
            <p key={dir.step}>{dir.instruction}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. With RealisticStoreMap

```tsx
import { RealisticStoreMap } from '~/components/store-map';

function ProductPage() {
  const products = [
    {
      id: 'billy-001',
      name: 'BILLY Bookcase',
      zone: 'warehouse',
      aisle: 25,
      bay: 3,
      section: 'A',
      stockLevel: 15,
    }
  ];

  return (
    <RealisticStoreMap
      products={products}
    />
  );
}
```

The map automatically includes:
- Click-to-navigate on products
- Visual path overlay
- Turn-by-turn directions
- Start location picker

## Common Scenarios

### Navigate to Specific Product

```tsx
navigation.startNavigation(
  { zone: 'entrance' },
  {
    zone: 'warehouse',
    aisle: 25,
    bay: 3,
    section: 'A'
  }
);
```

### Navigate to Showroom Area

```tsx
navigation.startNavigation(
  { zone: 'entrance' },
  { zone: 'showroom', aisle: 1 }
);
```

### Navigate to Market Hall

```tsx
navigation.startNavigation(
  { zone: 'warehouse', aisle: 25 },
  { zone: 'market', aisle: 14 }
);
```

### Check for Errors

```tsx
if (navigation.error) {
  console.error('Navigation error:', navigation.error);
}
```

### Clear Navigation

```tsx
navigation.clearNavigation();
```

## Available Start Locations

Use the `useStartLocations` hook to get predefined locations:

```tsx
import { useStartLocations } from '~/lib/pathfinding/useNavigation';

const startLocations = useStartLocations();
// Returns:
// [
//   { id: 'entrance', label: 'Store Entrance', location: {...} },
//   { id: 'showroom-start', label: 'Showroom Start', location: {...} },
//   { id: 'market-entrance', label: 'Market Hall Entrance', location: {...} },
//   { id: 'warehouse-entrance', label: 'Warehouse Entrance', location: {...} },
//   { id: 'checkout', label: 'Checkout Area', location: {...} }
// ]
```

## Zone Reference

### Showroom (Aisles 1-10)
- Aisles 1-3: Living Room
- Aisles 4-6: Bedroom
- Aisles 7-8: Kitchen
- Aisle 9: Dining
- Aisle 10: Children's Room

### Market Hall (Aisles 11-20)
- Aisles 11-13: Textiles
- Aisles 14-16: Cookshop
- Aisles 17-18: Lighting
- Aisles 19-20: Organization

### Warehouse (Aisles 21-30)
- Self-service aisles
- 10 bays per aisle (0-9)
- 4 sections per bay (A, B, C, D)

## PathResult Structure

```typescript
{
  path: Point[],           // Array of coordinates
  distance: number,        // Total distance in units
  directions: Direction[]  // Turn-by-turn instructions
}
```

## Direction Structure

```typescript
{
  step: number,            // Step number (1, 2, 3...)
  instruction: string,     // "Head north to Market Hall"
  from: Point,             // Starting point
  to: Point,               // Destination point
  distance: number         // Distance for this step
}
```

## Testing

Test the navigation system:

```typescript
import { runAllTests } from '~/lib/pathfinding/test-navigation';

// In browser console:
runAllTests();
```

## Examples

Check out `/app/components/store-map/NavigationExample.tsx` for a complete working example with:
- Multiple products
- Click-to-navigate functionality
- Visual path display
- User instructions

## Troubleshooting

### "Could not find start location"
- Ensure zone name is valid: 'entrance', 'showroom', 'market', 'warehouse', 'checkout', 'exit'
- Check aisle numbers are in valid range (1-30)

### "Could not find a path"
- Verify both locations are valid
- Check the graph connection (some areas may not be directly connected)

### Path Not Displaying
- Ensure `navigation.pathResult` is not null
- Check that the map component is rendering the path overlay
- Verify coordinates are within the SVG viewBox (0-1200, 0-800)

### No Directions Showing
- Check `navigation.pathResult.directions` array
- Ensure the directions panel component is rendered when `isNavigating === true`

## Performance Tips

1. The graph is built once and cached automatically
2. Path calculations are fast (<10ms) - no need to memoize
3. Clear navigation when not needed to free up memory

## Next Steps

- Read the [Full Documentation](./README.md)
- Explore [Architecture](./ARCHITECTURE.md)
- View [Implementation Details](../../../NAVIGATION_IMPLEMENTATION.md)
- Run tests with `test-navigation.ts`

## Need Help?

Common issues:
1. Wrong zone name → Check zone reference above
2. Invalid aisle → Must be 1-30
3. No path found → Some locations may not be connected (check graph.ts)
4. Coordinates off screen → Products must be within store bounds

For more details, see the comprehensive README.md in this directory.
