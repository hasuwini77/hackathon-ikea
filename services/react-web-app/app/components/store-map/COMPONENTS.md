# Store Map Components Overview

## Component Hierarchy

```
StoreMap (container)
│
├── StoreMapGrid
│   ├── AisleColumn (x30)
│   │   └── BayCell (x10 per aisle)
│   │       └── ProductMarker (if products present)
│   │
│   └── [Zone Background Colors]
│
├── MapControls (floating, top-right)
│   ├── Zoom In Button
│   ├── Zoom Display (percentage)
│   ├── Zoom Out Button
│   ├── Separator
│   └── Reset Zoom Button
│
├── ZoneLegend (floating, top-left or bottom)
│   ├── Showroom (Blue, Aisles 1-10)
│   ├── Market Hall (Green, Aisles 11-20)
│   └── Warehouse (Orange, Aisles 21-30)
│
└── LocationCard (conditional, slides in when location selected)
    ├── Location Details (Aisle X, Bay Y, Section Z)
    ├── Product Count Badge
    ├── Close Button
    └── Product List
        └── Product Item (x N)
            ├── Product Name
            ├── Article Number
            ├── Stock Badge
            └── Price
```

## Component Files

### Core Map Components
1. `StoreMapGrid.tsx` - Main grid layout
2. `AisleColumn.tsx` - Individual aisle
3. `BayCell.tsx` - Individual bay within aisle
4. `ProductMarker.tsx` - Product indicator

### UI Control Components (Task 7.4) ✨ NEW
5. `MapControls.tsx` - Zoom controls
6. `ZoneLegend.tsx` - Color legend
7. `LocationCard.tsx` - Location details card

### Supporting Files
- `types.ts` - TypeScript interfaces
- `config.ts` - Store layout configuration
- `utils.ts` - Utility functions
- `index.ts` - Public exports

## Data Flow

```
User Action → State Update → Component Re-render
```

### Zoom Control Flow
```
User clicks +/- button
  → MapControls fires onZoomIn/onZoomOut
    → Parent updates zoom state
      → Map re-renders with new scale
        → MapControls shows new percentage
```

### Location Selection Flow
```
User clicks on BayCell
  → StoreMapGrid fires onLocationClick
    → Parent updates selectedLocation state
      → Fetch products at location
        → LocationCard renders with data
          → User clicks product
            → Navigate to product detail page
```

### Legend Display
```
STORE_LAYOUT.zones
  → ZoneLegend component
    → Displays 3 zones with colors
      → Responsive: compact (mobile) or full (desktop)
```

## Responsive Breakpoints

- **Mobile (< 768px):**
  - ZoneLegend: compact, horizontal, bottom position
  - LocationCard: full-width, slides from bottom
  - MapControls: smaller touch targets

- **Desktop (≥ 768px):**
  - ZoneLegend: full details, vertical, top-left
  - LocationCard: fixed width, bottom-right, slides from right
  - MapControls: top-right position

## Color Scheme

### Zones
- **Showroom:** Blue (`bg-blue-500`, `bg-blue-100`)
- **Market Hall:** Green (`bg-green-500`, `bg-green-100`)
- **Warehouse:** Orange (`bg-orange-500`, `bg-orange-100`)

### UI Components
- Background: `bg-card`
- Border: `border`
- Text: `text-foreground`, `text-muted-foreground`
- Accent: `bg-accent`, `text-accent-foreground`

## Props Reference

### MapControls
```typescript
zoom: number              // Current zoom level (0.5-2.0)
onZoomIn: () => void      // Zoom in handler
onZoomOut: () => void     // Zoom out handler
onResetZoom: () => void   // Reset to 1.0
minZoom?: number          // Default: 0.5
maxZoom?: number          // Default: 2.0
```

### ZoneLegend
```typescript
zones: StoreZone[]        // Array of zone objects
compact?: boolean         // Mobile/compact mode
```

### LocationCard
```typescript
location: MapLocation     // { aisle, bay, section }
products: Product[]       // Products at location
onClose: () => void       // Close handler
onProductClick?: (p: Product) => void  // Product click handler
```

## Integration Example

```tsx
import {
  StoreMapGrid,
  MapControls,
  ZoneLegend,
  LocationCard,
  STORE_LAYOUT,
} from '~/components/store-map';

export default function StoreMapPage() {
  const [zoom, setZoom] = useState(1.0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [products, setProducts] = useState([]);

  return (
    <div className="relative h-screen">
      {/* Map */}
      <div style={{ transform: `scale(${zoom})` }}>
        <StoreMapGrid
          layout={STORE_LAYOUT}
          onLocationClick={setSelectedLocation}
        />
      </div>

      {/* Controls */}
      <MapControls
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z + 0.1, 2.0))}
        onZoomOut={() => setZoom(z => Math.max(z - 0.1, 0.5))}
        onResetZoom={() => setZoom(1.0)}
        className="absolute top-4 right-4"
      />

      {/* Legend */}
      <ZoneLegend
        zones={STORE_LAYOUT.zones}
        className="absolute top-4 left-4"
      />

      {/* Location Details */}
      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          products={products}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
}
```

## Accessibility Features

- ✓ ARIA labels on all interactive elements
- ✓ Keyboard navigation support
- ✓ Focus-visible states
- ✓ Screen reader friendly text
- ✓ Disabled state handling
- ✓ Semantic HTML structure

## Animation & Transitions

- ✓ Smooth zoom transitions (CSS transform)
- ✓ LocationCard slide-in (animate-in utility)
- ✓ Button hover states (transition-colors)
- ✓ Focus ring animations (ring utility)
