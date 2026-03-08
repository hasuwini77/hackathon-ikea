# 3D Warehouse Visualization

This component provides an immersive 3D visualization of the IKEA warehouse using Three.js and React Three Fiber.

## Features

- **Multi-floor warehouse layout**: Ground floor (showroom + market), first floor (warehouse), second floor (storage)
- **Color-coded zones**:
  - Showroom: IKEA Blue (#0051BA)
  - Market: Green (#009A44)
  - Warehouse: Orange (#FF9900)
- **Interactive 3D aisles**: Click to select, hover for labels
- **Product markers**: 3D spheres showing product locations with hover details
- **Dual camera modes**:
  - Orbit mode: Click and drag to rotate, scroll to zoom
  - First-person mode: WASD to move, mouse to look around
- **Floor navigation**: Switch between floors with UI controls
- **Selection system**: Click products or aisles to highlight and view details

## Components

### Warehouse3D.tsx
Main component that orchestrates the entire 3D scene. Handles state management for floor selection, product/aisle selection, and camera modes.

### Floor.tsx
Renders floor planes with grid lines in IKEA colors. Shows active/inactive states.

### Aisle.tsx
3D shelf units with:
- Zone-based coloring
- Shelf dividers
- Yellow accent strips (IKEA style)
- Hover and selection states
- Aisle labels

### ProductMarker3D.tsx
3D product location markers with:
- Pulsing spheres
- Vertical ground lines when selected
- Popup labels with product info
- Selection rings

### CameraControls.tsx
Two control modes:
- OrbitControls: Standard 3D navigation
- FirstPersonControls: FPS-style movement with WASD + mouse look

### types.ts
TypeScript definitions for:
- Product3D
- Aisle3D
- Floor3D
- Zone colors and constants

## Usage

```tsx
import { Warehouse3D } from '~/components/warehouse-3d';

// Basic usage with generated data
<Warehouse3D />

// With custom data
<Warehouse3D
  aisles={customAisles}
  products={customProducts}
  floors={customFloors}
  initialFloor={0}
  enableFirstPerson={true}
/>
```

## Route

Access the 3D warehouse at `/warehouse-3d`

## Controls

### Orbit Mode (Default)
- Left click + drag: Rotate camera
- Right click + drag: Pan camera
- Scroll: Zoom in/out
- Click objects: Select

### First Person Mode
- W/↑: Move forward
- S/↓: Move backward
- A/←: Move left
- D/→: Move right
- Q: Move down
- E: Move up
- Mouse: Look around (click to lock pointer)
- Click objects: Select

## Customization

The warehouse layout is generated with realistic IKEA-style dimensions:
- Showroom aisles: 8m wide × 8m tall × 3m deep
- Market aisles: 6m wide × 8m tall × 20m deep
- Warehouse aisles: 10m wide × 12m tall × 4m deep

Colors follow IKEA brand guidelines with blue (#0051BA) and yellow (#FFDB00) accents.

## Performance

- Shadow mapping enabled for realistic lighting
- LOD considerations for large warehouses
- Fog for depth perception
- Optimized geometry with appropriate poly counts
