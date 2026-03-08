# Store Map Components - Quick Reference

## Overview
Interactive 2D store map components with real-time stock level visualization, navigation, and filtering capabilities.

## Quick Start

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
    stockLevel: 15, // Stock quantity
  },
  // ... more products
];

<RealisticStoreMap
  products={products}
  highlightedLocation={{ zone: 'warehouse', aisle: 25 }}
  onLocationClick={(location) => console.log('Clicked:', location)}
/>
```

## Stock Level Color Coding

### Colors
- **Green** (`#22c55e`): In Stock (11+ units)
- **Amber** (`#f59e0b`): Low Stock (1-10 units)
- **Red** (`#ef4444`): Out of Stock (0 units) - with pulse animation

### Using Stock Utilities

```tsx
import {
  getStockColor,
  getStockLabel,
  isOutOfStock,
  STOCK_COLORS,
} from './components/store-map/stockColors';

// Get color for a stock level
const color = getStockColor(5); // Returns '#f59e0b' (amber)

// Get label
const label = getStockLabel(0); // Returns 'Out of Stock'

// Check status
if (isOutOfStock(product.stockLevel)) {
  // Show urgent notification
}
```

## Components

### RealisticStoreMap
Main interactive map component with all features.

**Props:**
- `products`: Array of product objects with locations and stock levels
- `highlightedLocation`: Optional location to highlight
- `onLocationClick`: Callback when a location is clicked
- `className`: Optional CSS classes

### ProductMarker
Individual product marker component.

**Props:**
- `section`: Optional section letter ('A', 'B', 'C', 'D')
- `stockLevel`: Stock quantity (0+)
- `productName`: Product name for tooltip

### NavigationExample
Complete demo with navigation features.

### StockColorDemo
Visual demonstration of stock color coding system.

## Features

### Interactive Map
- Pan and zoom controls
- Click zones to highlight
- Navigate to products
- Turn-by-turn directions

### Stock Visualization
- Color-coded product markers
- Pulse animation for out-of-stock items
- Hover tooltips with exact stock counts
- Filter by stock level

### Filtering
Use the filter buttons to show:
- All products
- Out of stock only
- Low stock only
- In stock only

## Data Structure

### Product Object
```typescript
interface Product {
  id: string;              // Unique identifier
  name?: string;           // Product name
  zone: string;            // 'showroom' | 'market' | 'warehouse'
  aisle?: number;          // Aisle number (1-30)
  bay?: number;            // Bay number within aisle
  section?: string;        // Section letter ('A', 'B', 'C', 'D')
  stockLevel?: number;     // Current stock quantity (defaults to 0)
}
```

### Location Object
```typescript
interface Location {
  zone: string;
  aisle?: number;
  bay?: number;
}
```

## Map Zones

### Showroom
- Aisles 1-10
- Themed room displays
- Living, Bedroom, Kitchen, Dining, Children's

### Market Hall
- Aisles 11-20
- Open sections
- Textiles, Cookshop, Lighting, Organization

### Warehouse
- Aisles 21-30
- Grid layout
- Self-service pickup area

## Customization

### Adjusting Stock Thresholds
Edit `stockColors.ts`:
```typescript
export const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK_MAX: 10,  // Change this value
  IN_STOCK_MIN: 11,   // And this value
} as const;
```

### Custom Colors
Edit `stockColors.ts`:
```typescript
export const STOCK_COLORS = {
  outOfStock: '#your-color',
  lowStock: '#your-color',
  inStock: '#your-color',
} as const;
```

## Advanced Usage

### Programmatic Navigation
```tsx
const navigation = useNavigation();

navigation.startNavigation(
  { zone: 'entrance' },
  { zone: 'warehouse', aisle: 25, bay: 3 }
);
```

### Filtering Products
```tsx
import { matchesStockFilter } from './stockColors';

const filteredProducts = products.filter(p =>
  matchesStockFilter(p.stockLevel, 'low')
);
```

### Custom Tooltips
Tooltips support multi-line content:
```tsx
showTooltip(`Product: ${name}\nStock: ${level}\nPrice: ${price}`);
```

## Examples

### Basic Map
```tsx
<RealisticStoreMap products={products} />
```

### With Highlighting
```tsx
<RealisticStoreMap
  products={products}
  highlightedLocation={{ zone: 'warehouse', aisle: 25 }}
/>
```

### With Click Handler
```tsx
<RealisticStoreMap
  products={products}
  onLocationClick={(loc) => {
    console.log(`Clicked ${loc.zone}, aisle ${loc.aisle}`);
  }}
/>
```

### Full Demo
```tsx
import NavigationExample from './components/store-map/NavigationExample';

<NavigationExample />
```

## Performance Tips

1. **Limit Product Count**: For best performance, limit visible products to ~50
2. **Use Filtering**: Enable filters to reduce rendered markers
3. **Lazy Loading**: Consider lazy-loading products as needed
4. **SVG Optimization**: Pulse animations are GPU-accelerated

## Accessibility

- Color-blind friendly color scheme
- Pulse animation provides non-color indicator
- Tooltips provide text alternatives
- Keyboard navigation supported
- ARIA labels on interactive elements

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Files

### Core Components
- `RealisticStoreMap.tsx` - Main map component
- `ProductMarker.tsx` - Product marker component
- `stockColors.ts` - Color utilities and constants

### Demo & Documentation
- `NavigationExample.tsx` - Full demo with navigation
- `StockColorDemo.tsx` - Color scheme demonstration
- `STOCK_COLORS.md` - Detailed documentation
- `CHANGES.md` - Implementation summary

### Supporting Components
- `StoreMap.tsx` - Alternative map view
- `StoreMapGrid.tsx` - Grid-based layout
- `MapControls.tsx` - Zoom/pan controls
- `ZoneLegend.tsx` - Legend component

## Troubleshooting

### Products not showing
- Check `zone` property matches map zones
- Ensure `aisle` is within valid range
- Verify product data structure

### Colors not updating
- Check `stockLevel` property is set
- Import utilities from `stockColors.ts`
- Clear component cache if needed

### Pulse animation not working
- Verify SVG animations are supported
- Check browser compatibility
- Ensure `stockLevel` is exactly 0

## Support

For issues or questions:
1. Check `STOCK_COLORS.md` for detailed docs
2. Review `StockColorDemo.tsx` for examples
3. See `NavigationExample.tsx` for integration

## License

Part of the IKEA Hackathon project.
