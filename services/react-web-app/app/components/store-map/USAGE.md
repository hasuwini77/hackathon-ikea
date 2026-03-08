# Store Map UI Controls Usage

This document shows how to use the new UI control components for the store map.

## Components

### 1. MapControls

Zoom controls with plus/minus buttons and reset.

```tsx
import { MapControls } from '~/components/store-map';

function MyMap() {
  const [zoom, setZoom] = useState(1.0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  return (
    <div className="relative">
      {/* Map content */}

      <MapControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        minZoom={0.5}
        maxZoom={2.0}
        className="absolute top-4 right-4"
      />
    </div>
  );
}
```

### 2. ZoneLegend

Shows color-coded zone information.

```tsx
import { ZoneLegend, STORE_LAYOUT } from '~/components/store-map';

function MyMap() {
  return (
    <div className="relative">
      {/* Map content */}

      {/* Desktop - full legend */}
      <ZoneLegend
        zones={STORE_LAYOUT.zones}
        className="hidden md:block absolute top-4 left-4"
      />

      {/* Mobile - compact legend */}
      <ZoneLegend
        zones={STORE_LAYOUT.zones}
        compact
        className="md:hidden absolute bottom-4 left-4 right-4"
      />
    </div>
  );
}
```

### 3. LocationCard

Info card when a location is selected on the map.

```tsx
import { LocationCard } from '~/components/store-map';
import type { MapLocation } from '~/components/store-map';
import type { Product } from '~/types/product';

function MyMap() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [productsAtLocation, setProductsAtLocation] = useState<Product[]>([]);

  const handleProductClick = (product: Product) => {
    // Navigate to product detail page
    navigate(`/products/${product._id}`);
  };

  return (
    <div className="relative">
      {/* Map content */}

      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          products={productsAtLocation}
          onClose={() => setSelectedLocation(null)}
          onProductClick={handleProductClick}
        />
      )}
    </div>
  );
}
```

## Complete Example

Here's how all three components work together:

```tsx
import { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import {
  StoreMapGrid,
  MapControls,
  ZoneLegend,
  LocationCard,
  STORE_LAYOUT,
} from '~/components/store-map';
import type { MapLocation } from '~/components/store-map';
import type { Product } from '~/types/product';

export default function StoreMapPage() {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1.0);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [productsAtLocation, setProductsAtLocation] = useState<Product[]>([]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  const handleLocationClick = (location: MapLocation) => {
    setSelectedLocation(location);
    // Fetch products at this location
    // setProductsAtLocation(fetchedProducts);
  };

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product._id}`);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map Grid */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
      >
        <StoreMapGrid
          layout={STORE_LAYOUT}
          onLocationClick={handleLocationClick}
        />
      </div>

      {/* Zoom Controls */}
      <MapControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        className="absolute top-4 right-4"
      />

      {/* Zone Legend - Desktop */}
      <ZoneLegend
        zones={STORE_LAYOUT.zones}
        className="hidden md:block absolute top-4 left-4"
      />

      {/* Zone Legend - Mobile */}
      <ZoneLegend
        zones={STORE_LAYOUT.zones}
        compact
        className="md:hidden absolute top-4 left-4"
      />

      {/* Location Card */}
      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          products={productsAtLocation}
          onClose={() => setSelectedLocation(null)}
          onProductClick={handleProductClick}
        />
      )}
    </div>
  );
}
```

## Features

### MapControls
- Floating control panel with zoom buttons
- Shows current zoom percentage
- Disables buttons at min/max zoom
- Reset button to return to 100%
- Uses lucide-react icons (ZoomIn, ZoomOut, RotateCcw)

### ZoneLegend
- Color-coded zones (Showroom, Market Hall, Warehouse)
- Compact mode for mobile (horizontal layout)
- Shows aisle ranges for each zone
- Responsive design

### LocationCard
- Displays location details (Aisle, Bay, Section)
- Lists all products at the location
- Click product to navigate to detail page
- Badge showing number of products
- Stock status badges (in stock / out of stock)
- Slide-in animation from bottom (mobile) or right (desktop)
- Close button

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components (Button, Card, Badge)
- Responsive design (mobile-first)
- Dark mode support (via shadcn theme)
- Smooth animations and transitions
