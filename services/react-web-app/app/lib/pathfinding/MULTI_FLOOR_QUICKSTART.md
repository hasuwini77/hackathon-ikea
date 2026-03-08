# Multi-Floor Navigation Quick Start

## 🚀 Quick Start

### 1. Basic Multi-Floor Navigation

```typescript
import { useNavigation } from '~/lib/pathfinding';

const navigation = useNavigation();

// Navigate from entrance (Floor 1) to warehouse (Floor 3)
navigation.startNavigation(
  { zone: 'entrance', floor: 1 },
  { zone: 'warehouse', floor: 3, aisle: 25 }
);
```

### 2. Accessibility Mode (Elevator Only)

```typescript
navigation.startNavigation(
  { zone: 'entrance', floor: 1 },
  { zone: 'warehouse', floor: 3, aisle: 25 },
  { accessibilityMode: true } // ♿ Elevator only
);
```

### 3. Display Floor-by-Floor Directions

```typescript
import { useFloorDirections } from '~/lib/pathfinding';

const floorGroups = useFloorDirections(navigation.pathResult);

{floorGroups.map(group => (
  <div key={group.floor}>
    <h3>{group.floorName}</h3>
    {group.directions.map(dir => (
      <div>{dir.instruction}</div>
    ))}
  </div>
))}
```

## 📊 Store Layout

```
Floor 3: Warehouse (Aisles 21-30)
   ↕ Escalators / Elevator / Stairs
Floor 2: Market Hall (Textiles, Cookshop, Lighting)
   ↕ Escalators / Elevator / Stairs
Floor 1: Entrance & Showroom (Living, Bedroom, Kitchen)
```

## 🎯 Common Routes

### Entrance → Warehouse Product
```typescript
navigation.startNavigation(
  { zone: 'entrance', floor: 1 },
  { zone: 'warehouse', floor: 3, aisle: 25, bay: 3, section: 'A' }
);
```

### Showroom → Market Hall
```typescript
navigation.startNavigation(
  { zone: 'showroom', floor: 1, aisle: 5 },
  { zone: 'market', floor: 2, aisle: 15 }
);
```

### Market Hall → Checkout
```typescript
navigation.startNavigation(
  { zone: 'market', floor: 2 },
  { zone: 'checkout', floor: 1 }
);
```

## ⚙️ Navigation Options

| Option | Description | Default |
|--------|-------------|---------|
| `accessibilityMode` | Use elevators only | `false` |
| `preferStairs` | Prefer stairs over escalators | `false` |

## 📍 Floor Numbers

- **Floor 1**: Entrance, Showroom, Checkout, Exit
- **Floor 2**: Market Hall (Textiles, Cookshop, Lighting, Plants)
- **Floor 3**: Warehouse (Aisles 21-30, Self-Service)

## 🔄 Vertical Transitions

| Type | Direction | Speed | Accessibility |
|------|-----------|-------|---------------|
| Escalator | One-way | Fast (15) | No |
| Stairs | Both ways | Medium (20) | No |
| Elevator | Both ways | Slow (30) | Yes ♿ |

## 💡 Pro Tips

1. **Accessibility Mode**: Always use for wheelchair/stroller users
2. **Floor Count**: Check `pathResult.floors.length` to see how many floors you'll visit
3. **Floor Transitions**: Look for `direction.floorChange` to identify escalator/elevator steps
4. **Direct Elevator**: Elevator can skip floors (e.g., Floor 1 → 3 directly)

## 📱 Example: Full Navigation Component

```typescript
import { useNavigation, useFloorDirections } from '~/lib/pathfinding';

function NavigationPanel() {
  const navigation = useNavigation();
  const floorGroups = useFloorDirections(navigation.pathResult);

  const navigateToProduct = () => {
    navigation.startNavigation(
      { zone: 'entrance', floor: 1 },
      { zone: 'warehouse', floor: 3, aisle: 25, bay: 3, section: 'A' },
      { accessibilityMode: false }
    );
  };

  return (
    <div>
      <button onClick={navigateToProduct}>Navigate</button>

      {navigation.pathResult && (
        <>
          <div>
            <strong>Floors: </strong>
            {navigation.pathResult.floors.join(' → ')}
          </div>
          <div>
            <strong>Distance: </strong>
            {navigation.pathResult.distance} units
          </div>

          {floorGroups.map(group => (
            <div key={group.floor}>
              <h3>{group.floorName}</h3>
              <ol>
                {group.directions.map(dir => (
                  <li key={dir.step}>
                    {dir.instruction}
                    {dir.floorChange && ' 🔼'}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

## 🔍 Debugging

```typescript
// Check if route uses elevator
const usesElevator = navigation.pathResult?.directions.some(
  dir => dir.type === 'elevator'
);

// Count floor transitions
const floorChanges = navigation.pathResult?.directions.filter(
  dir => dir.floorChange
).length;

// Get all transition types
const transitions = navigation.pathResult?.directions
  .filter(dir => dir.floorChange)
  .map(dir => dir.type);
```

## 📚 Learn More

- [Full Multi-Floor Documentation](./MULTI_FLOOR.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Main README](./README.md)
