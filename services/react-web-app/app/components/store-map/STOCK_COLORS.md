# Stock Level Color Coding Documentation

## Overview

The 2D store map now includes a comprehensive stock level color coding system that provides visual indicators for product availability throughout the store. This feature helps users quickly identify product stock status at a glance.

## Color Scheme

The stock level colors follow this standardized scheme:

```typescript
const stockColors = {
  outOfStock: '#ef4444',  // red-500
  lowStock: '#f59e0b',    // amber-500
  inStock: '#22c55e',     // green-500
};
```

### Stock Level Thresholds

| Stock Level | Color | Indicator |
|-------------|-------|-----------|
| 0 units | Red (`#ef4444`) | Pulsing animation |
| 1-10 units | Amber (`#f59e0b`) | Static marker |
| 11+ units | Green (`#22c55e`) | Static marker |

## Features

### 1. Visual Markers

Each product location on the map displays a colored dot/marker indicating stock status:
- **Green**: Healthy stock levels (11+ units)
- **Amber**: Low stock warning (1-10 units)
- **Red**: Out of stock (0 units)

### 2. Pulse Animation

Out-of-stock items feature a pulsing animation to draw immediate attention:
- Outer ring pulses outward
- Fades from 50% opacity to 0%
- 1.5-second animation cycle
- Repeats indefinitely

### 3. Hover Tooltips

Hovering over any product marker displays detailed information:
- Product name
- Exact stock count
- Multi-line tooltip format

### 4. Stock Filter

Interactive filter buttons at the top of the map allow users to:
- **All**: Show all products regardless of stock level
- **Out of Stock**: Show only products with 0 units
- **Low Stock**: Show only products with 1-10 units
- **In Stock**: Show only products with 11+ units

### 5. Enhanced Legend

The map legend displays:
- Color indicators for each stock level
- Stock level ranges
- Animated example for out-of-stock items
- Zone color indicators

## Component Usage

### RealisticStoreMap

```tsx
import { RealisticStoreMap } from './components/store-map/RealisticStoreMap';

const products = [
  {
    id: 'billy-001',
    name: 'BILLY Bookcase',
    zone: 'warehouse',
    aisle: 25,
    bay: 3,
    section: 'A',
    stockLevel: 15, // Will display as green
  },
  {
    id: 'vardagen-005',
    name: 'VARDAGEN Pot Set',
    zone: 'market',
    aisle: 14,
    bay: 4,
    section: 'B',
    stockLevel: 0, // Will display as red with pulse
  },
];

<RealisticStoreMap
  products={products}
  highlightedLocation={highlightedLocation}
  onLocationClick={handleLocationClick}
/>
```

### ProductMarker

```tsx
import { ProductMarker } from './components/store-map/ProductMarker';

// With stock level
<ProductMarker
  stockLevel={5}
  productName="KALLAX Shelf"
/>

// With section label
<ProductMarker
  section="A"
  stockLevel={0}
  productName="MALM Bed Frame"
/>
```

## Technical Implementation

### Stock Color Functions

```typescript
// Get color based on stock level
const getStockColor = (stockLevel: number = 0): string => {
  if (stockLevel === 0) return '#ef4444'; // red-500 - out of stock
  if (stockLevel <= 10) return '#f59e0b'; // amber-500 - low stock
  return '#22c55e'; // green-500 - good stock
};

// Determine if product is out of stock
const isOutOfStock = (stockLevel: number = 0): boolean => {
  return stockLevel === 0;
};
```

### SVG Animation

Out-of-stock markers use SVG animations for the pulsing effect:

```tsx
{isOutOfStock(stockLevel) && (
  <circle
    cx={x}
    cy={y}
    r={radius + 3}
    fill={color}
    opacity="0.5"
  >
    <animate
      attributeName="r"
      from={radius + 3}
      to={radius + 8}
      dur="1.5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      from="0.5"
      to="0"
      dur="1.5s"
      repeatCount="indefinite"
    />
  </circle>
)}
```

## User Experience Benefits

1. **Quick Visual Assessment**: Users can instantly identify stock availability across the entire store
2. **Attention to Critical Items**: Pulsing animation draws immediate attention to out-of-stock products
3. **Efficient Planning**: Filter functionality allows users to focus on specific stock levels
4. **Detailed Information**: Hover tooltips provide exact stock counts without cluttering the interface
5. **Consistent Design**: Colors match IKEA's design language while maintaining accessibility

## Accessibility Considerations

- Colors chosen to be distinguishable for most forms of color blindness
- Pulse animation provides additional non-color indicator for out-of-stock items
- Tooltips provide textual alternatives to visual indicators
- Filter buttons include both color indicators and text labels

## Future Enhancements

Potential improvements for the stock color coding system:

1. **Threshold Customization**: Allow users to set custom stock level thresholds
2. **Color Preferences**: Support for different color schemes or high-contrast modes
3. **Stock Trends**: Show if stock is increasing/decreasing with additional indicators
4. **Notifications**: Alert users when filtered stock levels change
5. **Print-Friendly Mode**: Alternative indicators for printed maps

## Examples

See the `NavigationExample.tsx` component for a complete demonstration of the stock level color coding system with diverse products across all stock levels.

## Related Files

- `/app/components/store-map/RealisticStoreMap.tsx` - Main map component with stock visualization
- `/app/components/store-map/ProductMarker.tsx` - Individual product marker component
- `/app/components/store-map/NavigationExample.tsx` - Demo with diverse stock levels
