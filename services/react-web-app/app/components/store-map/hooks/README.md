# Store Map Interaction Hooks

React hooks for managing store map interactions, including zoom controls, URL parameter parsing, and product location queries.

## Hooks

### `useMapState`

Central state management for map zoom, highlighted locations, and selected aisles.

```tsx
import { useMapState } from '~/components/store-map/hooks';

function StoreMap() {
  const mapState = useMapState();

  return (
    <div>
      <div>Current zoom: {mapState.zoom}</div>
      <button onClick={mapState.zoomIn}>Zoom In</button>
      <button onClick={mapState.zoomOut}>Zoom Out</button>
      <button onClick={mapState.resetZoom}>Reset</button>

      {/* Map component using zoom level */}
      <MapGrid
        zoom={mapState.zoom}
        highlightedLocation={mapState.highlightedLocation}
        onLocationClick={mapState.setHighlightedLocation}
      />
    </div>
  );
}
```

**Features:**
- Zoom range: 0.5 to 2.0, step 0.25
- Location highlighting
- Aisle selection tracking

### `useLocationFromUrl`

Parse and validate location from URL search parameters (`?aisle=5&bay=3&section=A`).

```tsx
import { useLocationFromUrl, useMapState } from '~/components/store-map/hooks';

function StoreMapPage() {
  // Parse location from URL
  const urlLocation = useLocationFromUrl();

  // Initialize map with URL location
  const mapState = useMapState(urlLocation);

  return (
    <div>
      {urlLocation && (
        <div>
          Viewing: Aisle {urlLocation.aisle}, Bay {urlLocation.bay}
          {urlLocation.section && `, Section ${urlLocation.section}`}
        </div>
      )}
      <MapGrid highlightedLocation={mapState.highlightedLocation} />
    </div>
  );
}
```

**Validation:**
- Requires both `aisle` and `bay` parameters
- Aisle range: 1-30
- Bay range: 1-10
- Section: A-D (optional)

### `useProductsInLocation`

Fetch products at a specific warehouse location.

```tsx
import {
  useLocationFromUrl,
  useProductsInLocation
} from '~/components/store-map/hooks';

function LocationProductList() {
  const location = useLocationFromUrl();
  const { products, loading, error } = useProductsInLocation(location);

  if (!location) {
    return <div>Select a location to view products</div>;
  }

  if (loading) {
    return <div>Loading products...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Products at Aisle {location.aisle}, Bay {location.bay}</h2>
      <div>Found {products.length} products</div>
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

**Matching:**
- Matches by aisle-bay (required)
- Section matching (optional, if specified)
- Filters products from parsed location strings (e.g., "5-3-A")

## Complete Example

```tsx
import {
  useLocationFromUrl,
  useMapState,
  useProductsInLocation
} from '~/components/store-map/hooks';

function StoreMapWithProducts() {
  // Parse location from URL (?aisle=5&bay=3&section=A)
  const urlLocation = useLocationFromUrl();

  // Initialize map state with URL location
  const mapState = useMapState(urlLocation);

  // Fetch products at the highlighted location
  const { products, loading } = useProductsInLocation(
    mapState.highlightedLocation
  );

  return (
    <div className="store-map-container">
      {/* Zoom controls */}
      <div className="controls">
        <button onClick={mapState.zoomIn}>+</button>
        <span>{mapState.zoom}x</span>
        <button onClick={mapState.zoomOut}>-</button>
      </div>

      {/* Map grid */}
      <StoreMapGrid
        zoom={mapState.zoom}
        highlightedLocation={mapState.highlightedLocation}
        selectedAisle={mapState.selectedAisle}
        onLocationClick={mapState.setHighlightedLocation}
        onAisleClick={mapState.setSelectedAisle}
      />

      {/* Product list */}
      <div className="product-list">
        {loading && <div>Loading products...</div>}
        {!loading && products.length > 0 && (
          <>
            <h3>Products at this location</h3>
            {products.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
```

## Type Definitions

```typescript
interface MapLocation {
  aisle: number;
  bay: number;
  section: string;
}

interface UseMapStateResult {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  highlightedLocation: MapLocation | null;
  setHighlightedLocation: (loc: MapLocation | null) => void;
  clearHighlight: () => void;
  selectedAisle: number | null;
  setSelectedAisle: (aisle: number | null) => void;
}

interface UseProductsInLocationResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}
```
