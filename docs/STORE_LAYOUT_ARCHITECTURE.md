# IKEA Store Layout System - Architecture Document

**Version:** 1.0
**Date:** 2026-03-03
**Status:** Design Phase
**Target:** Hackathon MVP

---

## Executive Summary

This document defines the architecture for a store layout visualization system that helps IKEA staff quickly locate products in the warehouse. The system displays a visual map of the store with product locations, allowing staff to scan a barcode and immediately see where the item is located.

**Core Value Proposition:**
- Reduce time spent searching for products by 70%
- Improve staff efficiency and customer service
- Provide intuitive spatial navigation vs. just text coordinates
- Works offline-first with Couchbase Edge Server

**MVP Scope (Hackathon Demo):**
- Visual grid-based store map showing aisles and bays
- Product location highlighting when scanned
- Tap-to-navigate from product detail view
- Basic zoom capability
- Responsive mobile-first design

---

## 1. Store Layout Concept

### 1.1 IKEA Store Physical Layout

IKEA stores follow a consistent three-zone layout:

1. **Showroom** (Display Areas) - Aisles 1-10
   - Room settings and inspiration
   - Products in display context
   - Low-traffic areas for browsing

2. **Market Hall** (Self-Serve) - Aisles 11-20
   - Smaller items
   - Home accessories
   - Medium density storage

3. **Warehouse** (Self-Serve) - Aisles 21-30
   - Flat-pack furniture
   - Large items
   - High-density storage
   - Staff focus area

### 1.2 Current Location Format

Based on the seeded data, locations follow the pattern: `"5-3-A"`
- **Aisle**: 1-30 (numeric)
- **Bay**: 1-10 (numeric, represents position along aisle)
- **Section**: A-D (letter, represents vertical shelf position)

**Data Model:**
```typescript
interface UIProductLocation {
  aisle: string;   // "5"
  bay: string;     // "3"
  section: string; // "A"
}
```

### 1.3 Spatial Relationships

```
Store Layout (Top-Down View)

┌─────────────────────────────────────────────┐
│  ENTRANCE                                    │
├─────────────────────────────────────────────┤
│                                              │
│  SHOWROOM (Aisles 1-10)                     │
│  ┌──────┬──────┬──────┬──────┐             │
│  │ A1-10│ A2-10│ A3-10│ ...  │             │
│  │      │      │      │      │             │
│  │ A1-1 │ A2-1 │ A3-1 │ ...  │             │
│  └──────┴──────┴──────┴──────┘             │
│                                              │
│  MARKET HALL (Aisles 11-20)                 │
│  ┌──────┬──────┬──────┬──────┐             │
│  │A11-10│A12-10│A13-10│ ...  │             │
│  │      │      │      │      │             │
│  │A11-1 │A12-1 │A13-1 │ ...  │             │
│  └──────┴──────┴──────┴──────┘             │
│                                              │
│  WAREHOUSE (Aisles 21-30)                   │
│  ┌──────┬──────┬──────┬──────┐             │
│  │A21-10│A22-10│A23-10│ ...  │             │
│  │      │      │      │      │             │
│  │A21-1 │A22-1 │A22-1 │ ...  │             │
│  └──────┴──────┴──────┴──────┘             │
│                                              │
│  CHECKOUT                                    │
└─────────────────────────────────────────────┘

Each bay is a vertical cell: Bay 1 is at front, Bay 10 at back
Section A-D represents shelf height (A=bottom, D=top)
```

---

## 2. Visual Design Options Analysis

### Option A: SVG-Based Interactive Floor Plan

**Pros:**
- Infinite zoom without pixelation
- Can add rich interactivity (hover states, animations)
- Easy to style with CSS
- Good accessibility with ARIA labels
- Can load from external SVG file

**Cons:**
- More complex to build from scratch
- Need to create/maintain SVG artwork
- Performance can degrade with many elements
- Requires SVG knowledge

**Complexity**: Medium-High
**Time Estimate**: 6-8 hours

---

### Option B: CSS Grid-Based Schematic Map

**Pros:**
- Quick to implement with Tailwind
- Native responsive behavior
- Easy to understand and maintain
- No external dependencies
- Excellent performance
- Natural keyboard navigation
- Perfect for hackathon speed

**Cons:**
- Limited visual fidelity
- Basic zoom (CSS transform only)
- Less "impressive" visually
- Constrained to grid layout

**Complexity**: Low
**Time Estimate**: 2-3 hours

---

### Option C: Canvas-Based with Zoom/Pan

**Pros:**
- Maximum visual flexibility
- Smooth pan/zoom with libraries (like react-zoom-pan-pinch)
- Can render many elements efficiently
- Impressive demo experience

**Cons:**
- Accessibility challenges (canvas is opaque to screen readers)
- More complex state management
- Touch interaction needs careful handling
- Harder to debug
- Overkill for 220 products

**Complexity**: High
**Time Estimate**: 8-12 hours

---

### **RECOMMENDATION: Option B - CSS Grid-Based Schematic Map**

**Rationale:**
1. **Time Constraint**: 2-3 hours vs 6-12 hours for alternatives
2. **Hackathon Context**: Functionality > visual polish
3. **Maintainability**: Simple code, easy for team to understand
4. **Accessibility**: Native HTML benefits
5. **Responsive**: Works on all screen sizes out of the box
6. **Stack Alignment**: Leverages existing Tailwind expertise

**MVP Approach:**
- Build a functional schematic using CSS Grid
- If time permits, enhance with zoom and animations
- Can upgrade to SVG/Canvas post-hackathon if desired

---

## 3. Data Model

### 3.1 Core Types

```typescript
/**
 * Store layout configuration
 * Defines the physical structure of the store
 */
export interface StoreLayout {
  id: string;
  name: string;
  zones: StoreZone[];
  totalAisles: number;
  maxBaysPerAisle: number;
  sectionsPerBay: string[]; // ["A", "B", "C", "D"]
  lastUpdated: string;
}

/**
 * Store zones (Showroom, Market Hall, Warehouse)
 */
export interface StoreZone {
  id: string;
  name: string;
  description: string;
  aisleRange: [number, number]; // [start, end] inclusive
  color: string; // Tailwind color class
  icon?: string; // lucide-react icon name
}

/**
 * Aisle representation with metadata
 */
export interface Aisle {
  number: number;
  zone: string;
  bayCount: number;
  productCount: number; // Computed: how many products in this aisle
  isHighTraffic?: boolean;
}

/**
 * Detailed location with computed properties
 */
export interface ProductLocationDetail extends UIProductLocation {
  aisle: string;
  bay: string;
  section: string;

  // Computed properties
  zone: string; // "Showroom" | "Market Hall" | "Warehouse"
  zoneColor: string; // Tailwind color
  aisleNumber: number; // Parsed from aisle string
  bayNumber: number; // Parsed from bay string
  displayName: string; // "Aisle 5, Bay 3, Section A"
  shortDisplay: string; // "5-3-A"
}

/**
 * Product location with visual coordinates
 */
export interface ProductLocationWithCoords extends ProductLocationDetail {
  // Grid coordinates for CSS positioning
  gridRow: number; // Bay position (1-10)
  gridColumn: number; // Aisle position (1-30)
  productId: string;
  productName: string;
}

/**
 * Map interaction state
 */
export interface MapState {
  selectedLocation: ProductLocationDetail | null;
  highlightedAisles: number[];
  zoomLevel: number; // 1.0 = 100%, 1.5 = 150%, etc.
  viewMode: 'full' | 'zone'; // Show full map or single zone
  currentZone?: string;
}
```

### 3.2 Mock Store Configuration

For hackathon, we'll use a static configuration:

```typescript
export const MOCK_STORE_LAYOUT: StoreLayout = {
  id: "store-001",
  name: "IKEA Burbank",
  totalAisles: 30,
  maxBaysPerAisle: 10,
  sectionsPerBay: ["A", "B", "C", "D"],
  zones: [
    {
      id: "showroom",
      name: "Showroom",
      description: "Inspirational room displays",
      aisleRange: [1, 10],
      color: "blue",
      icon: "Home"
    },
    {
      id: "market-hall",
      name: "Market Hall",
      description: "Home accessories and decor",
      aisleRange: [11, 20],
      color: "green",
      icon: "ShoppingBag"
    },
    {
      id: "warehouse",
      name: "Warehouse",
      description: "Flat-pack furniture storage",
      aisleRange: [21, 30],
      color: "orange",
      icon: "Warehouse"
    }
  ],
  lastUpdated: new Date().toISOString()
};
```

### 3.3 Data Utilities

```typescript
/**
 * Parse location string "5-3-A" into structured format
 */
export function parseLocation(locationString: string): ProductLocationDetail {
  const [aisle, bay, section] = locationString.split('-');

  const aisleNum = parseInt(aisle, 10);
  const bayNum = parseInt(bay, 10);

  // Determine zone based on aisle
  let zone = "Unknown";
  let zoneColor = "gray";

  if (aisleNum >= 1 && aisleNum <= 10) {
    zone = "Showroom";
    zoneColor = "blue";
  } else if (aisleNum >= 11 && aisleNum <= 20) {
    zone = "Market Hall";
    zoneColor = "green";
  } else if (aisleNum >= 21 && aisleNum <= 30) {
    zone = "Warehouse";
    zoneColor = "orange";
  }

  return {
    aisle,
    bay,
    section,
    zone,
    zoneColor,
    aisleNumber: aisleNum,
    bayNumber: bayNum,
    displayName: `Aisle ${aisle}, Bay ${bay}, Section ${section}`,
    shortDisplay: locationString
  };
}

/**
 * Get zone for a given aisle number
 */
export function getZoneForAisle(aisleNumber: number): StoreZone | undefined {
  return MOCK_STORE_LAYOUT.zones.find(
    zone => aisleNumber >= zone.aisleRange[0] && aisleNumber <= zone.aisleRange[1]
  );
}

/**
 * Calculate grid position for CSS Grid layout
 */
export function getGridPosition(location: ProductLocationDetail) {
  return {
    gridRow: location.bayNumber, // 1-10
    gridColumn: location.aisleNumber // 1-30
  };
}
```

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
app/
└── components/
    └── store-map/
        ├── StoreMap.tsx              (Main container - routing & state)
        ├── StoreMapGrid.tsx          (Grid layout renderer)
        ├── StoreZoneLegend.tsx       (Color-coded zone key)
        ├── AisleColumn.tsx           (Single aisle column)
        ├── BayCell.tsx               (Individual bay cell)
        ├── ProductMarker.tsx         (Highlighted location indicator)
        ├── LocationCard.tsx          (Product location detail card)
        ├── MapControls.tsx           (Zoom, filter controls)
        └── hooks/
            ├── useStoreLayout.ts     (Store configuration logic)
            ├── useProductLocation.ts (Parse & enhance location data)
            └── useMapInteraction.ts  (Zoom, pan, selection state)
```

### 4.2 Component Specifications

#### **StoreMap.tsx** (Main Container)

```typescript
interface StoreMapProps {
  productLocation?: ProductLocationDetail; // If provided, highlight this location
  products?: Product[]; // All products for density heatmap
  onLocationSelect?: (location: ProductLocationDetail) => void;
  initialZoom?: number;
  viewMode?: 'full' | 'zone';
}

/**
 * Main store map component
 *
 * Features:
 * - Renders full store grid layout
 * - Highlights selected product location
 * - Shows density heatmap (products per aisle)
 * - Zoom controls
 * - Zone filtering
 * - Responsive mobile/desktop layouts
 *
 * States:
 * - Default: Shows full store with zone colors
 * - Highlighted: Pulsing marker on selected location
 * - Zoomed: Enlarged view of specific zone/aisle
 */
export function StoreMap({ productLocation, ... }: StoreMapProps) {
  const { layout } = useStoreLayout();
  const { mapState, updateZoom, selectLocation } = useMapInteraction();

  // If productLocation provided, automatically highlight it
  useEffect(() => {
    if (productLocation) {
      selectLocation(productLocation);
      // Optionally auto-zoom to the zone
      const zone = getZoneForAisle(productLocation.aisleNumber);
      if (zone) {
        updateViewMode('zone', zone.id);
      }
    }
  }, [productLocation]);

  return (
    <div className="store-map-container">
      <StoreZoneLegend zones={layout.zones} />
      <MapControls
        zoomLevel={mapState.zoomLevel}
        onZoomChange={updateZoom}
        viewMode={mapState.viewMode}
      />
      <StoreMapGrid
        layout={layout}
        highlightedLocation={mapState.selectedLocation}
        zoomLevel={mapState.zoomLevel}
      />
      {mapState.selectedLocation && (
        <LocationCard location={mapState.selectedLocation} />
      )}
    </div>
  );
}
```

---

#### **StoreMapGrid.tsx** (Grid Renderer)

```typescript
interface StoreMapGridProps {
  layout: StoreLayout;
  highlightedLocation: ProductLocationDetail | null;
  zoomLevel: number;
  products?: Product[];
}

/**
 * Renders the CSS Grid-based store layout
 *
 * Grid Structure:
 * - 30 columns (aisles)
 * - 10 rows (bays)
 * - Each cell represents one bay in one aisle
 *
 * Responsive:
 * - Mobile: Horizontal scroll with sticky zone headers
 * - Desktop: Fits viewport with zoom controls
 *
 * Accessibility:
 * - Keyboard navigation (arrow keys between cells)
 * - Screen reader announces: "Aisle 5, Bay 3, Warehouse zone"
 * - Focus visible indicators
 */
export function StoreMapGrid({ layout, highlightedLocation, ... }: StoreMapGridProps) {
  return (
    <div
      className="store-grid-container overflow-x-auto"
      style={{ transform: `scale(${zoomLevel})` }}
    >
      {/* Zone Headers */}
      <div className="grid grid-cols-30 gap-1 mb-2">
        {layout.zones.map(zone => (
          <div
            key={zone.id}
            className={`col-span-10 text-center py-2 rounded bg-${zone.color}-100`}
          >
            {zone.name}
          </div>
        ))}
      </div>

      {/* Grid: 30 columns x 10 rows */}
      <div className="grid grid-cols-30 gap-1 min-w-max">
        {Array.from({ length: 30 }, (_, aisleIdx) => (
          <AisleColumn
            key={aisleIdx}
            aisleNumber={aisleIdx + 1}
            bayCount={layout.maxBaysPerAisle}
            zone={getZoneForAisle(aisleIdx + 1)}
            highlightedBay={
              highlightedLocation?.aisleNumber === aisleIdx + 1
                ? highlightedLocation.bayNumber
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}
```

---

#### **AisleColumn.tsx** (Single Aisle)

```typescript
interface AisleColumnProps {
  aisleNumber: number;
  bayCount: number;
  zone?: StoreZone;
  highlightedBay: number | null;
}

/**
 * Renders a single aisle column with all its bays
 *
 * Layout:
 * - Vertical column of bay cells
 * - Bay 1 at top (front of store)
 * - Bay 10 at bottom (back of store)
 * - Aisle number label at top
 *
 * Visual States:
 * - Normal: Light zone color background
 * - Highlighted: One bay has pulsing marker
 * - Hover: Slight scale + shadow
 */
export function AisleColumn({ aisleNumber, bayCount, zone, highlightedBay }: AisleColumnProps) {
  const zoneColor = zone?.color || 'gray';

  return (
    <div className="flex flex-col gap-1">
      {/* Aisle Label */}
      <div className={`text-xs font-bold text-center py-1 bg-${zoneColor}-200 rounded`}>
        {aisleNumber}
      </div>

      {/* Bay Cells */}
      {Array.from({ length: bayCount }, (_, bayIdx) => (
        <BayCell
          key={bayIdx}
          aisleNumber={aisleNumber}
          bayNumber={bayIdx + 1}
          isHighlighted={highlightedBay === bayIdx + 1}
          zoneColor={zoneColor}
        />
      ))}
    </div>
  );
}
```

---

#### **BayCell.tsx** (Individual Bay)

```typescript
interface BayCellProps {
  aisleNumber: number;
  bayNumber: number;
  isHighlighted: boolean;
  zoneColor: string;
  onClick?: () => void;
}

/**
 * Single bay cell in the grid
 *
 * Size:
 * - Mobile: 40x40px (touch-friendly)
 * - Desktop: 32x32px
 *
 * States:
 * - Default: Light background, subtle border
 * - Highlighted: Pulsing animation, primary color, product marker
 * - Hover: Tooltip with "Aisle X, Bay Y"
 * - Focus: Thick border for keyboard nav
 *
 * Accessibility:
 * - role="button"
 * - aria-label="Aisle 5, Bay 3"
 * - Keyboard navigable
 */
export function BayCell({ aisleNumber, bayNumber, isHighlighted, zoneColor }: BayCellProps) {
  return (
    <button
      className={cn(
        "bay-cell relative w-8 h-8 md:w-10 md:h-10 rounded border transition-all",
        `bg-${zoneColor}-50 border-${zoneColor}-200`,
        "hover:scale-110 hover:shadow-md hover:z-10",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:z-20",
        isHighlighted && "animate-pulse ring-4 ring-primary bg-primary/20"
      )}
      aria-label={`Aisle ${aisleNumber}, Bay ${bayNumber}`}
      title={`Aisle ${aisleNumber}, Bay ${bayNumber}`}
    >
      {isHighlighted && (
        <ProductMarker aisleNumber={aisleNumber} bayNumber={bayNumber} />
      )}
    </button>
  );
}
```

---

#### **ProductMarker.tsx** (Location Highlight)

```typescript
interface ProductMarkerProps {
  aisleNumber: number;
  bayNumber: number;
  productName?: string;
}

/**
 * Visual marker indicating product location
 *
 * Appearance:
 * - Pulsing dot/pin icon
 * - Primary brand color
 * - Absolute positioned in center of bay cell
 * - Scale animation to draw attention
 *
 * Accessibility:
 * - aria-label announces product location
 * - Decorative, not interactive (parent cell is button)
 */
export function ProductMarker({ aisleNumber, bayNumber, productName }: ProductMarkerProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <MapPin
        className="h-6 w-6 text-primary animate-bounce"
        aria-label={productName ? `${productName} located here` : "Product location"}
      />
    </div>
  );
}
```

---

#### **MapControls.tsx** (Zoom & Filters)

```typescript
interface MapControlsProps {
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  viewMode: 'full' | 'zone';
  onViewModeChange: (mode: 'full' | 'zone') => void;
}

/**
 * Floating control panel for map interactions
 *
 * Features:
 * - Zoom in/out buttons (0.8x to 2.0x)
 * - Reset zoom button
 * - View mode toggle (Full map vs. Single zone)
 * - Zone quick-jump buttons
 *
 * Position: Fixed bottom-right on mobile, top-right on desktop
 *
 * Accessibility:
 * - All buttons have aria-labels
 * - Keyboard shortcuts: + for zoom in, - for zoom out
 */
export function MapControls({ zoomLevel, onZoomChange, ... }: MapControlsProps) {
  return (
    <div className="map-controls fixed bottom-4 right-4 md:top-4 flex flex-col gap-2 bg-background/95 backdrop-blur p-2 rounded-lg shadow-lg border">
      <Button
        size="icon"
        variant="outline"
        onClick={() => onZoomChange(Math.min(2.0, zoomLevel + 0.2))}
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="outline"
        onClick={() => onZoomChange(Math.max(0.8, zoomLevel - 0.2))}
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="outline"
        onClick={() => onZoomChange(1.0)}
        aria-label="Reset zoom"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

---

#### **StoreZoneLegend.tsx** (Zone Key)

```typescript
interface StoreZoneLegendProps {
  zones: StoreZone[];
  activeZone?: string;
  onZoneClick?: (zoneId: string) => void;
}

/**
 * Legend showing store zones with colors and aisle ranges
 *
 * Layout:
 * - Horizontal list on desktop
 * - Vertical list on mobile
 * - Color-coded badges
 * - Shows aisle ranges
 *
 * Interactive:
 * - Click zone to filter/zoom to that zone
 * - Active zone highlighted
 */
export function StoreZoneLegend({ zones, activeZone, onZoneClick }: StoreZoneLegendProps) {
  return (
    <div className="zone-legend flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
      {zones.map(zone => {
        const Icon = lucideIcons[zone.icon || 'Square'];
        const isActive = activeZone === zone.id;

        return (
          <button
            key={zone.id}
            onClick={() => onZoneClick?.(zone.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md border transition-all",
              `bg-${zone.color}-50 border-${zone.color}-200`,
              "hover:scale-105 hover:shadow-md",
              isActive && "ring-2 ring-primary"
            )}
            aria-pressed={isActive}
          >
            <Icon className={`h-4 w-4 text-${zone.color}-600`} />
            <div className="text-left">
              <div className="text-sm font-medium">{zone.name}</div>
              <div className="text-xs text-muted-foreground">
                Aisles {zone.aisleRange[0]}-{zone.aisleRange[1]}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

### 4.3 Custom Hooks

#### **useStoreLayout.ts**

```typescript
/**
 * Provides store layout configuration and utilities
 */
export function useStoreLayout() {
  const [layout] = useState<StoreLayout>(MOCK_STORE_LAYOUT);

  const getZone = useCallback((aisleNumber: number) => {
    return getZoneForAisle(aisleNumber);
  }, []);

  const getAisleStats = useCallback((aisleNumber: number, products: Product[]) => {
    const productsInAisle = products.filter(p => {
      const parsedLocation = parseLocation(`${p.location.aisle}-${p.location.bay}-${p.location.section}`);
      return parsedLocation.aisleNumber === aisleNumber;
    });

    return {
      productCount: productsInAisle.length,
      lowStockCount: productsInAisle.filter(p => p.stock.quantity < 5).length
    };
  }, []);

  return {
    layout,
    getZone,
    getAisleStats
  };
}
```

---

#### **useProductLocation.ts**

```typescript
/**
 * Parse and enhance product location data
 */
export function useProductLocation(product: Product | null) {
  const [locationDetail, setLocationDetail] = useState<ProductLocationDetail | null>(null);

  useEffect(() => {
    if (!product) {
      setLocationDetail(null);
      return;
    }

    const locationString = `${product.location.aisle}-${product.location.bay}-${product.location.section}`;
    const parsed = parseLocation(locationString);
    setLocationDetail(parsed);
  }, [product]);

  const getGridPosition = useCallback(() => {
    if (!locationDetail) return null;
    return {
      row: locationDetail.bayNumber,
      column: locationDetail.aisleNumber
    };
  }, [locationDetail]);

  return {
    locationDetail,
    getGridPosition,
    isValid: locationDetail !== null
  };
}
```

---

#### **useMapInteraction.ts**

```typescript
/**
 * Manages map interaction state (zoom, selection, view mode)
 */
export function useMapInteraction() {
  const [mapState, setMapState] = useState<MapState>({
    selectedLocation: null,
    highlightedAisles: [],
    zoomLevel: 1.0,
    viewMode: 'full',
    currentZone: undefined
  });

  const selectLocation = useCallback((location: ProductLocationDetail) => {
    setMapState(prev => ({
      ...prev,
      selectedLocation: location,
      highlightedAisles: [location.aisleNumber]
    }));
  }, []);

  const updateZoom = useCallback((zoomLevel: number) => {
    setMapState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.8, Math.min(2.0, zoomLevel))
    }));
  }, []);

  const updateViewMode = useCallback((mode: 'full' | 'zone', zoneId?: string) => {
    setMapState(prev => ({
      ...prev,
      viewMode: mode,
      currentZone: zoneId
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setMapState(prev => ({
      ...prev,
      selectedLocation: null,
      highlightedAisles: []
    }));
  }, []);

  return {
    mapState,
    selectLocation,
    updateZoom,
    updateViewMode,
    clearSelection
  };
}
```

---

## 5. User Interactions

### 5.1 Primary User Flows

#### **Flow 1: Scan → View Location on Map**

```
1. Staff scans product barcode
   ↓
2. ProductDetail modal opens with location card (current behavior)
   ↓
3. User taps "Navigate to Location" button
   ↓
4. Map view opens in a sheet/modal
   ↓
5. Map automatically:
   - Highlights the product's bay with pulsing marker
   - Zooms to the relevant zone
   - Shows location details card
   ↓
6. Staff can see spatial context and navigate physically
```

**Implementation:**
- Add route: `/map/:productId`
- Update ProductDetail button: `onClick={() => navigate(\`/map/${product._id}\`)}`
- StoreMap receives product location via URL params or state

---

#### **Flow 2: Browse Map → See Product Details**

```
1. Staff opens map view (new nav item)
   ↓
2. Sees full store layout with zone colors
   ↓
3. Taps on a bay cell
   ↓
4. Sheet opens showing all products in that bay
   ↓
5. Taps a product to see full details
```

**Future Enhancement** (post-hackathon)

---

#### **Flow 3: Zoom & Explore**

```
1. Map view opens
   ↓
2. Use zoom controls to enlarge specific zone
   ↓
3. Horizontal scroll to explore warehouse
   ↓
4. Tap zone legend to quick-jump to zone
```

---

### 5.2 Interaction Details

| Interaction | Desktop | Mobile | Touch Target | Accessibility |
|-------------|---------|--------|--------------|---------------|
| Zoom In/Out | Click buttons or scroll wheel | Pinch gesture + buttons | 44x44px min | Keyboard: +/- keys |
| Select Bay | Click cell | Tap cell | 40x40px | Arrow keys to navigate |
| Pan Map | Click-drag | Touch-drag | N/A | Scroll with arrow keys |
| Reset View | Click reset button | Tap reset button | 44x44px | Escape key |
| Zone Filter | Click zone badge | Tap zone badge | 48px min height | Tab + Enter |

---

### 5.3 State Management

```typescript
// Map view state stored in URL for deep linking
// Example: /map?aisle=5&bay=3&section=A&zoom=1.5

// State restoration:
const searchParams = useSearchParams();
const initialLocation = {
  aisle: searchParams.get('aisle'),
  bay: searchParams.get('bay'),
  section: searchParams.get('section')
};
const initialZoom = parseFloat(searchParams.get('zoom') || '1.0');
```

**Benefits:**
- Shareable URLs
- Browser back/forward works
- Deep linking from external sources
- State persists on refresh

---

## 6. Integration Points

### 6.1 Integration with ProductDetail Component

**Current State:**
- ProductDetail shows location as text: "Aisle 5, Bay 3, Section A"
- "Navigate to Location" button shows alert placeholder

**Changes Required:**

**File:** `/services/react-web-app/app/components/ProductDetail.tsx`

```typescript
import { useNavigate } from "@remix-run/react";

export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const navigate = useNavigate();

  const handleNavigateToLocation = () => {
    // Build location string for URL
    const locationQuery = new URLSearchParams({
      aisle: product.location.aisle,
      bay: product.location.bay,
      section: product.location.section,
      productId: product._id,
      productName: product.name
    }).toString();

    navigate(`/map?${locationQuery}`);
  };

  return (
    <>
      {/* ... existing code ... */}

      <Button
        variant="default"
        className="w-full h-12 text-base"
        onClick={handleNavigateToLocation}
      >
        <Navigation className="h-5 w-5 mr-2" aria-hidden="true" />
        View on Store Map
      </Button>
    </>
  );
}
```

---

### 6.2 New Route Setup

**File:** `/services/react-web-app/app/routes/map.tsx`

```typescript
import { useSearchParams } from "@remix-run/react";
import { StoreMap } from "~/components/store-map/StoreMap";
import { parseLocation } from "~/lib/store-layout";

export default function MapRoute() {
  const [searchParams] = useSearchParams();

  // Parse location from URL
  const aisle = searchParams.get('aisle');
  const bay = searchParams.get('bay');
  const section = searchParams.get('section');
  const productName = searchParams.get('productName');

  const locationDetail = aisle && bay && section
    ? parseLocation(`${aisle}-${bay}-${section}`)
    : null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Store Map</h1>
            {productName && (
              <p className="text-sm text-muted-foreground">{productName}</p>
            )}
          </div>
          <Button variant="ghost" onClick={() => window.history.back()}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 overflow-hidden">
        <StoreMap productLocation={locationDetail} />
      </div>
    </div>
  );
}
```

---

### 6.3 Navigation Menu Update

Add a "Store Map" link to the main navigation:

**File:** `/services/react-web-app/app/components/Navigation.tsx` (or equivalent)

```typescript
<NavLink to="/map">
  <Map className="h-5 w-5" />
  Store Map
</NavLink>
```

---

### 6.4 Data Flow Diagram

```
┌─────────────────┐
│  Scan Product   │
│   (Barcode)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ ProductDetail   │
│   Component     │
│  - Shows info   │
│  - Location card│
└────────┬────────┘
         │
         │ onClick="Navigate"
         ↓
┌─────────────────┐         ┌──────────────────┐
│   /map route    │────────→│ useProductLocation│
│  (URL params)   │         │    (parse data)   │
└────────┬────────┘         └──────────────────┘
         │
         ↓
┌─────────────────┐         ┌──────────────────┐
│   StoreMap      │────────→│ useStoreLayout   │
│   Component     │         │  (config data)   │
└────────┬────────┘         └──────────────────┘
         │
         ↓
┌─────────────────┐
│ StoreMapGrid    │
│  - Render grid  │
│  - Highlight    │
│    location     │
└─────────────────┘
```

---

## 7. Task Breakdown

### Epic: Store Layout Map Feature

**Goal:** Enable staff to visualize product locations on a store map for faster warehouse navigation.

---

### Task 7.1: Create Store Layout Data Layer

**Description:** Implement core data structures and utilities for store layout management.

**Acceptance Criteria:**
- Create `/app/types/store-layout.ts` with all TypeScript interfaces
- Create `/app/lib/store-layout/config.ts` with `MOCK_STORE_LAYOUT`
- Create `/app/lib/store-layout/utils.ts` with:
  - `parseLocation()` function
  - `getZoneForAisle()` function
  - `getGridPosition()` function
- Add unit tests for parsing logic
- Export from `/app/lib/store-layout/index.ts`

**Complexity:** S (2 hours)
**Dependencies:** None
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/types/store-layout.ts`
- `/services/react-web-app/app/lib/store-layout/config.ts`
- `/services/react-web-app/app/lib/store-layout/utils.ts`
- `/services/react-web-app/app/lib/store-layout/index.ts`

---

### Task 7.2: Build Core Map Components

**Description:** Implement the visual component hierarchy for the store map.

**Acceptance Criteria:**
- Create `StoreMapGrid.tsx` with CSS Grid layout (30 cols x 10 rows)
- Create `AisleColumn.tsx` to render single aisle with bay cells
- Create `BayCell.tsx` with hover states and accessibility
- Create `ProductMarker.tsx` with pulsing animation
- Apply Tailwind styling consistent with existing app design
- Test responsive behavior on mobile and desktop
- Ensure 44x44px minimum touch targets
- Implement keyboard navigation (arrow keys between cells)

**Complexity:** M (3-4 hours)
**Dependencies:** Task 7.1
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/components/store-map/StoreMapGrid.tsx`
- `/services/react-web-app/app/components/store-map/AisleColumn.tsx`
- `/services/react-web-app/app/components/store-map/BayCell.tsx`
- `/services/react-web-app/app/components/store-map/ProductMarker.tsx`

---

### Task 7.3: Implement Map Interaction Hooks

**Description:** Create custom hooks for map state management and interaction logic.

**Acceptance Criteria:**
- Create `useStoreLayout.ts` hook with layout config and zone utilities
- Create `useProductLocation.ts` hook to parse and enhance location data
- Create `useMapInteraction.ts` hook for zoom, selection, view mode
- Handle URL search params for deep linking
- Implement zoom constraints (0.8x to 2.0x)
- Support keyboard shortcuts (+/- for zoom, Esc to reset)

**Complexity:** S (2 hours)
**Dependencies:** Task 7.1
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/components/store-map/hooks/useStoreLayout.ts`
- `/services/react-web-app/app/components/store-map/hooks/useProductLocation.ts`
- `/services/react-web-app/app/components/store-map/hooks/useMapInteraction.ts`

---

### Task 7.4: Build Map UI Controls

**Description:** Implement zoom controls, zone legend, and location card components.

**Acceptance Criteria:**
- Create `MapControls.tsx` with zoom in/out/reset buttons
- Create `StoreZoneLegend.tsx` with color-coded zone badges
- Create `LocationCard.tsx` to show selected location details
- Position controls as fixed floating panel (bottom-right mobile, top-right desktop)
- Implement smooth zoom transitions with CSS transform
- Add zone click handlers for quick navigation
- Ensure all controls have aria-labels

**Complexity:** S (2 hours)
**Dependencies:** Task 7.2, 7.3
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/components/store-map/MapControls.tsx`
- `/services/react-web-app/app/components/store-map/StoreZoneLegend.tsx`
- `/services/react-web-app/app/components/store-map/LocationCard.tsx`

---

### Task 7.5: Create Main StoreMap Container

**Description:** Build the top-level container component that orchestrates all map features.

**Acceptance Criteria:**
- Create `StoreMap.tsx` main container component
- Integrate all sub-components (grid, controls, legend, marker)
- Accept `productLocation` prop to highlight specific location
- Handle auto-zoom to zone when location provided
- Implement URL state synchronization
- Add loading states and error boundaries
- Ensure responsive layout (full-screen on mobile, embedded on desktop)
- Test with real product data

**Complexity:** M (3 hours)
**Dependencies:** Task 7.2, 7.3, 7.4
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/components/store-map/StoreMap.tsx`
- `/services/react-web-app/app/components/store-map/index.ts` (exports)

---

### Task 7.6: Create Map Route and Navigation

**Description:** Set up the `/map` route and integrate with existing navigation.

**Acceptance Criteria:**
- Create `/app/routes/map.tsx` route component
- Parse location from URL search params (`?aisle=5&bay=3&section=A`)
- Render StoreMap with location highlighting
- Add header with product name (if provided) and close button
- Add "Store Map" link to main navigation menu
- Handle back navigation gracefully
- Support deep linking (shareable URLs)
- Test route with various URL parameters

**Complexity:** S (1-2 hours)
**Dependencies:** Task 7.5
**Priority:** Critical Path

**Files to Create:**
- `/services/react-web-app/app/routes/map.tsx`

**Files to Modify:**
- Main navigation component (add map link)

---

### Task 7.7: Integrate with ProductDetail Component

**Description:** Update ProductDetail "Navigate" button to open map view with location highlighted.

**Acceptance Criteria:**
- Update ProductDetail.tsx "Navigate to Location" button
- Build location query string from product.location
- Use `navigate()` to open `/map` route with location params
- Pass product name for context in map header
- Remove placeholder alert
- Test flow: Scan → Detail → Navigate → Map with highlight
- Ensure smooth transition (no flash/flicker)

**Complexity:** S (1 hour)
**Dependencies:** Task 7.6
**Priority:** Critical Path

**Files to Modify:**
- `/services/react-web-app/app/components/ProductDetail.tsx`

---

### Task 7.8: Polish and Accessibility Audit

**Description:** Final refinements, accessibility improvements, and cross-device testing.

**Acceptance Criteria:**
- Run accessibility audit with axe DevTools
- Fix any WCAG 2.1 AA violations
- Test keyboard navigation thoroughly
- Test with screen reader (VoiceOver/NVDA)
- Verify color contrast ratios (minimum 4.5:1)
- Test on iOS Safari, Android Chrome
- Add loading skeletons for map rendering
- Optimize CSS Grid performance (memoization if needed)
- Add animation preferences (respect `prefers-reduced-motion`)
- Document keyboard shortcuts in UI

**Complexity:** S (2 hours)
**Dependencies:** Task 7.7
**Priority:** High

**Files to Modify:**
- All store-map components (add aria attributes, loading states)

---

### Summary Table

| Task | Description | Complexity | Hours | Dependencies | Priority |
|------|-------------|------------|-------|--------------|----------|
| 7.1 | Data Layer | S | 2 | None | Critical |
| 7.2 | Core Components | M | 3-4 | 7.1 | Critical |
| 7.3 | Interaction Hooks | S | 2 | 7.1 | Critical |
| 7.4 | UI Controls | S | 2 | 7.2, 7.3 | Critical |
| 7.5 | Main Container | M | 3 | 7.2-7.4 | Critical |
| 7.6 | Route Setup | S | 1-2 | 7.5 | Critical |
| 7.7 | ProductDetail Integration | S | 1 | 7.6 | Critical |
| 7.8 | Polish & A11y | S | 2 | 7.7 | High |
| **TOTAL** | | | **16-19 hours** | | |

**Hackathon Timeline (2 days):**
- Day 1: Tasks 7.1-7.5 (core functionality)
- Day 2: Tasks 7.6-7.8 (integration and polish)

---

## 8. MVP vs Full Feature

### 8.1 MVP Scope (Hackathon Demo)

**What's Included:**
- CSS Grid-based store map with 30 aisles x 10 bays
- Zone color-coding (Showroom, Market Hall, Warehouse)
- Product location highlighting with pulsing marker
- Zoom controls (0.8x to 2.0x)
- Zone legend with quick navigation
- Integration with ProductDetail button
- Responsive mobile-first layout
- Basic accessibility (keyboard nav, ARIA labels)
- Deep linking via URL params

**What's Excluded:**
- Real-time staff/customer tracking (BLE)
- Route pathfinding (A* algorithm)
- Multi-product comparison view
- Heatmaps (busy aisles)
- 3D isometric view
- Offline map caching
- Section-level detail (A-D shelves)
- Product photos on map
- Custom store layouts per location

**Time Estimate:** 16-19 hours (2 hackathon days)

---

### 8.2 Post-Hackathon Enhancements

#### **Phase 2: Enhanced Navigation (1 week)**

1. **Route Pathfinding**
   - Implement A* pathfinding algorithm
   - Show walking path from current location to product
   - Estimate walk time
   - Highlight path on map with animated line

2. **Section Detail View**
   - Zoom into bay to see sections A-D
   - Vertical shelf visualization
   - Show multiple products in same bay

3. **Multi-Product Mode**
   - Select multiple products to find
   - Optimized route that visits all locations
   - Shopping list integration

---

#### **Phase 3: Real-Time Features (2-3 weeks)**

1. **Indoor Positioning (BLE)**
   - Integrate Bluetooth beacons
   - Show staff's current location on map
   - Auto-rotate map based on orientation
   - "You are here" indicator

2. **Live Occupancy**
   - Show busy vs. quiet aisles
   - Real-time heatmap based on staff density
   - Suggest alternative aisles if crowded

3. **Collaborative Features**
   - See other staff on map (opt-in)
   - Request assistance via map
   - Mark "out of stock" visually

---

#### **Phase 4: Advanced Analytics (1 month)**

1. **Usage Analytics**
   - Track most-searched aisles
   - Identify confusing locations (high bounce rate)
   - Optimize warehouse layout based on data

2. **Predictive Stocking**
   - ML model predicts out-of-stock locations
   - Proactive restocking alerts
   - Integration with inventory system

3. **Custom Store Layouts**
   - Admin panel to configure store map
   - Support for different IKEA store sizes
   - Upload custom floor plans (SVG)
   - Per-store configuration in database

---

### 8.3 Technical Debt Considerations

**Known Limitations in MVP:**

1. **Hardcoded Layout:**
   - Store configuration is static (`MOCK_STORE_LAYOUT`)
   - Would need database table for multi-store support
   - **Future:** Store layout in Couchbase with sync

2. **CSS Grid Scalability:**
   - 30 columns works for IKEA, but not flexible
   - Large stores (50+ aisles) would need virtualization
   - **Future:** Consider react-window for large grids

3. **No Offline Caching:**
   - Map renders on-demand, not pre-cached
   - Could be slow on first load
   - **Future:** Service worker caching of map tiles

4. **Basic Zoom:**
   - CSS transform zoom is simple but not smooth
   - Pinch-to-zoom not implemented
   - **Future:** Use react-zoom-pan-pinch library

5. **Section Ignored:**
   - MVP only highlights bay, not specific shelf section (A-D)
   - **Future:** Add vertical shelf visualization

---

## 9. Design Rationale

### 9.1 Why CSS Grid Over Canvas/SVG?

**Decision Factors:**

| Criteria | CSS Grid | Canvas | SVG |
|----------|----------|--------|-----|
| Implementation Speed | Fast (2-3 hrs) | Slow (8-12 hrs) | Medium (6-8 hrs) |
| Accessibility | Native | Manual | Manual |
| Responsiveness | Built-in | Custom | Custom |
| Maintainability | Easy | Complex | Medium |
| Scalability | Good (30 aisles) | Excellent | Good |
| Visual Quality | Basic | High | High |
| Team Familiarity | High (Tailwind) | Low | Medium |

**For a hackathon MVP, speed and simplicity win.** CSS Grid delivers 80% of the value in 20% of the time.

---

### 9.2 Mobile-First Design Principles

1. **Touch Targets:** All interactive elements minimum 44x44px
2. **Horizontal Scroll:** Map is wider than viewport, scrolls horizontally
3. **Fixed Controls:** Zoom buttons always accessible (bottom-right)
4. **Large Text:** Aisle numbers 16px+, readable at arm's length
5. **Contrast:** Zone colors meet WCAG AA (4.5:1 ratio)
6. **Single Tap:** No hover-dependent features
7. **Gesture Support:** Pinch-to-zoom (future enhancement)

---

### 9.3 Color Palette

**Zone Colors (IKEA Brand Alignment):**
- **Showroom:** Blue (`blue-500`) - Calm, inspirational
- **Market Hall:** Green (`green-500`) - Fresh, home goods
- **Warehouse:** Orange (`orange-500`) - Industrial, urgency

**Semantic Colors:**
- **Highlighted Location:** Primary (`primary`) - IKEA yellow/blue
- **Selected Bay:** Primary with pulse animation
- **Low Stock:** Destructive (`red-500`)
- **Background:** Neutral grays for contrast

---

### 9.4 Performance Considerations

**Optimization Strategies:**

1. **Lazy Rendering:**
   - Only render visible aisles in viewport
   - Use Intersection Observer for virtualization (future)

2. **Memoization:**
   - Memoize AisleColumn and BayCell components
   - Prevent unnecessary re-renders on zoom

3. **CSS Transform:**
   - Use `transform: scale()` for zoom (GPU-accelerated)
   - Avoid re-layout on zoom

4. **Static Configuration:**
   - Store layout loaded once, never changes
   - No API calls for map data

**Expected Performance:**
- Initial render: <100ms
- Zoom interaction: <16ms (60fps)
- Navigation to map route: <200ms

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// Example: /app/lib/store-layout/utils.test.ts

describe('parseLocation', () => {
  it('should parse valid location string', () => {
    const result = parseLocation('5-3-A');
    expect(result.aisleNumber).toBe(5);
    expect(result.bayNumber).toBe(3);
    expect(result.section).toBe('A');
    expect(result.zone).toBe('Showroom');
  });

  it('should handle warehouse zone', () => {
    const result = parseLocation('25-7-B');
    expect(result.zone).toBe('Warehouse');
    expect(result.zoneColor).toBe('orange');
  });

  it('should generate display names', () => {
    const result = parseLocation('15-9-C');
    expect(result.displayName).toBe('Aisle 15, Bay 9, Section C');
    expect(result.shortDisplay).toBe('15-9-C');
  });
});

describe('getZoneForAisle', () => {
  it('should return correct zone for aisle 1', () => {
    const zone = getZoneForAisle(1);
    expect(zone?.name).toBe('Showroom');
  });

  it('should return undefined for invalid aisle', () => {
    const zone = getZoneForAisle(999);
    expect(zone).toBeUndefined();
  });
});
```

---

### 10.2 Integration Tests

```typescript
// Example: Map route integration test

describe('Map Route', () => {
  it('should highlight location from URL params', () => {
    render(<MapRoute />, {
      initialEntries: ['/map?aisle=5&bay=3&section=A']
    });

    expect(screen.getByLabelText('Aisle 5, Bay 3')).toHaveClass('animate-pulse');
  });

  it('should show product name in header', () => {
    render(<MapRoute />, {
      initialEntries: ['/map?aisle=10&bay=2&section=B&productName=BILLY%20Bookcase']
    });

    expect(screen.getByText('BILLY Bookcase')).toBeInTheDocument();
  });
});
```

---

### 10.3 Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('StoreMap Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<StoreMap />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    render(<StoreMap />);

    const firstCell = screen.getByLabelText('Aisle 1, Bay 1');
    firstCell.focus();

    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });

    const nextCell = screen.getByLabelText('Aisle 2, Bay 1');
    expect(nextCell).toHaveFocus();
  });
});
```

---

### 10.4 Manual Testing Checklist

**Mobile (iOS Safari):**
- [ ] Map renders correctly on iPhone 12/13/14
- [ ] Touch targets are easy to tap (44x44px)
- [ ] Horizontal scroll is smooth
- [ ] Zoom buttons work
- [ ] Location highlights are visible
- [ ] Text is readable without zooming
- [ ] No horizontal overflow issues

**Desktop (Chrome):**
- [ ] Map fits viewport at 1920x1080
- [ ] Hover states work on bay cells
- [ ] Keyboard navigation works (arrow keys)
- [ ] Zoom shortcuts work (+/- keys)
- [ ] Layout responds to window resize

**Accessibility:**
- [ ] Screen reader announces locations
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Color is not sole indicator
- [ ] Text meets contrast ratios

**Integration:**
- [ ] ProductDetail → Map navigation works
- [ ] URL params persist location
- [ ] Back button returns to product detail
- [ ] Deep links work (shared URLs)

---

## 11. Future Considerations

### 11.1 Internationalization (i18n)

- Zone names need translation (Showroom → Utställning in Swedish)
- Location format varies by region (some countries use letters for aisles)
- Direction labels ("Front", "Back") need localization

---

### 11.2 Accessibility Enhancements

- **Voice Navigation:** "Navigate to aisle five, bay three"
- **Haptic Feedback:** Vibrate when location highlighted
- **High Contrast Mode:** Respect system preferences
- **Text Scaling:** Support dynamic type (iOS) and font size preferences

---

### 11.3 Advanced Features

**AR Mode:**
- Overlay arrows on camera view
- Point phone at aisle signs to get directions
- Integrate with ARKit/ARCore

**Smart Watch Integration:**
- Show simplified map on Apple Watch
- Haptic pulses as you approach location
- Voice commands via Siri/Google Assistant

**Offline Mode:**
- Cache map tiles with Service Worker
- Show last known product locations
- Sync updates when back online

---

## 12. Appendix

### 12.1 Tailwind Grid Configuration

To support 30 columns, add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      gridTemplateColumns: {
        '30': 'repeat(30, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-10': 'span 10 / span 10',
      }
    }
  }
}
```

---

### 12.2 Lucide Icons Used

- `MapPin` - Product location marker
- `Navigation` - Navigate button
- `ZoomIn` / `ZoomOut` / `Maximize` - Zoom controls
- `Home` - Showroom zone icon
- `ShoppingBag` - Market Hall zone icon
- `Warehouse` - Warehouse zone icon
- `Map` - Navigation menu icon
- `X` - Close button

---

### 12.3 Key Dependencies

No new dependencies required! Uses existing stack:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui (Button, Card, Badge)
- lucide-react (icons)
- react-router (navigation)

---

### 12.4 Useful References

- **CSS Grid Guide:** https://css-tricks.com/snippets/css/complete-guide-grid/
- **WCAG 2.1 AA:** https://www.w3.org/WAI/WCAG21/quickref/
- **Touch Target Guidelines:** https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- **IKEA Design System:** https://www.ikea.com/us/en/this-is-ikea/design/

---

## 13. Success Metrics

**Hackathon Demo Goals:**
- Map loads in <200ms
- Location highlighted within 1 second of navigation
- Zero critical accessibility violations
- Works on presenter's phone (iOS/Android)
- Impresses judges with visual clarity

**Post-Launch KPIs:**
- 50%+ of staff use map feature weekly
- Average time-to-locate reduced by 60 seconds
- 90%+ satisfaction in staff survey
- Zero customer complaints about "can't find product"

---

## Conclusion

This architecture document defines a practical, implementable store layout system optimized for a hackathon timeline. The CSS Grid approach balances speed of development with functionality, delivering a working MVP in 16-19 hours.

**Key Strengths:**
- Simple, maintainable codebase
- Excellent accessibility out of the box
- Leverages existing tech stack (no new dependencies)
- Clear upgrade path to advanced features
- Mobile-first design for staff tablets/phones

**Next Steps:**
1. Review and approve this architecture
2. Assign tasks from Section 7 to team members
3. Build in priority order (Tasks 7.1 → 7.8)
4. Test thoroughly on mobile devices
5. Prepare demo script for judges

**Timeline:**
- Day 1: Core functionality (Tasks 7.1-7.5)
- Day 2: Integration and polish (Tasks 7.6-7.8)

This system will significantly improve IKEA staff efficiency and demonstrate strong offline-first technical capabilities.

---

**Document Metadata:**
- **Author:** Claude (AI Assistant)
- **Reviewers:** [To be added]
- **Approved By:** [To be added]
- **Next Review:** Post-hackathon retrospective
