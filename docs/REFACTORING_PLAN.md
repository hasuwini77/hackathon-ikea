# IKEA Offline-First Product Finder - Refactoring Plan

## Current Architecture Overview

The application uses **Couchbase Lite Edge** as the PRIMARY database for offline-first capabilities:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT STATE (COUCHBASE-FIRST)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   React App ──────► Couchbase Edge ◄──sync──► Couchbase Server             │
│       │                   (PRIMARY)                  (Central)              │
│       │                                                                     │
│       └─(legacy)──► FastAPI ──────────────────► PostgreSQL                 │
│                                                    (Legacy)                 │
│                                                                             │
│   ARCHITECTURE:                                                             │
│   • Couchbase Edge provides offline-first capability                       │
│   • Bidirectional sync via Sync Gateway                                    │
│   • PostgreSQL kept for legacy FastAPI endpoints                           │
│   • Client-side filtering needs optimization                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TARGET STATE (OPTIMIZED COUCHBASE)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   React App                                                                 │
│       │                                                                     │
│       ├── Offline: ─────► Couchbase Edge (local cache + queue)            │
│       │                      │                                              │
│       │                      └─► Sync Gateway ─► Couchbase Server          │
│       │                                                                     │
│       └── Complex Queries: ─► N1QL API ──────► Couchbase Server           │
│                                                                             │
│   BENEFITS:                                                                 │
│   • True offline-first with automatic sync                                 │
│   • N1QL for complex server-side queries                                   │
│   • Conflict resolution via _rev tokens                                    │
│   • Channel-based data filtering via Sync Gateway                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Optimize Couchbase Document Design

### 1.1 Document Schema Optimization

**Current Structure:**
```javascript
{
  _id: "product:123.456.78",
  _rev: "1-abc123",
  type: "product",
  article_number: "123.456.78",
  name: "BILLY Bookcase",
  // ... other fields
}
```

**Optimized Structure:**
```javascript
{
  _id: "product:123.456.78",
  _rev: "1-abc123",
  type: "product",

  // Core fields (indexed)
  article_number: "123.456.78",
  name: "BILLY Bookcase",
  category: "furniture/storage",

  // Location (for spatial queries)
  location: {
    zone: "A",
    aisle: 12,
    bay: 3,
    section: 2,
    coordinates: { x: 150, y: 200 }
  },

  // Stock (mutable, conflict-prone)
  stock: {
    quantity: 45,
    last_updated: "2026-03-03T10:30:00Z",
    updated_by: "device:tablet-01"
  },

  // Search optimization
  search_text: "billy bookcase white furniture storage shelves",
  tags: ["furniture", "storage", "bestseller"],

  // Sync metadata
  channels: ["store:001", "category:furniture"],
  last_sync: "2026-03-03T10:00:00Z"
}
```

### 1.2 Document Type Strategy

Create multiple document types for better organization:

```javascript
// Product document
{ _id: "product:123.456.78", type: "product", ... }

// Stock update document (for offline queue)
{ _id: "stock_update:uuid", type: "stock_update", product_id: "product:123.456.78", ... }

// Scan event document
{ _id: "scan:uuid", type: "scan_event", product_id: "product:123.456.78", ... }
```

### 1.3 Index Creation

**Create MapReduce views:**

```javascript
// View: by_category
function(doc) {
  if (doc.type === 'product' && doc.category) {
    emit(doc.category, null);
  }
}

// View: by_location
function(doc) {
  if (doc.type === 'product' && doc.location) {
    emit([doc.location.zone, doc.location.aisle], null);
  }
}

// View: search_index
function(doc) {
  if (doc.type === 'product' && doc.search_text) {
    var words = doc.search_text.toLowerCase().split(/\s+/);
    words.forEach(function(word) {
      emit(word, null);
    });
  }
}
```

---

## Phase 2: Sync Gateway Configuration

### 2.1 Sync Function

**File:** `sync-gateway-config.json`

```json
{
  "databases": {
    "ikea_products": {
      "server": "couchbase://localhost",
      "bucket": "ikea_products",
      "users": {
        "store_tablet": { "password": "secure_pass", "admin_channels": ["store:001"] }
      },
      "sync": `
        function(doc, oldDoc) {
          // Channel assignment based on store
          if (doc.type === 'product') {
            channel('store:' + doc.store_id);
            channel('category:' + doc.category);

            // Global channel for all products
            channel('products');
          }

          // Stock updates go to specific channels
          if (doc.type === 'stock_update') {
            channel('stock_updates');
            requireUser(doc.updated_by);
          }

          // Conflict resolution: last-write-wins for stock
          if (doc.stock && oldDoc && oldDoc.stock) {
            if (new Date(doc.stock.last_updated) < new Date(oldDoc.stock.last_updated)) {
              throw({forbidden: 'Stale stock update'});
            }
          }
        }
      `
    }
  }
}
```

### 2.2 Channel-Based Filtering

```typescript
// app/lib/couchbase/sync.ts
export async function configureReplication() {
  const replicator = await database.createReplication({
    target: 'ws://sync-gateway:4984/ikea_products',
    channels: [
      'store:001',           // Only sync products for store 001
      'category:furniture',  // Only furniture products
      'stock_updates'        // Stock update queue
    ],
    continuous: true,
    // Pull: Server → Edge
    // Push: Edge → Server (offline changes)
  });

  await replicator.start();
}
```

### 2.3 Conflict Resolution Strategy

```typescript
// app/lib/couchbase/conflicts.ts
export function resolveConflict(doc1: Product, doc2: Product): Product {
  // For stock updates: use latest timestamp
  if (doc1.stock && doc2.stock) {
    const latest = new Date(doc1.stock.last_updated) > new Date(doc2.stock.last_updated)
      ? doc1
      : doc2;

    return {
      ...latest,
      _rev: doc1._rev, // Keep winning revision
      stock: {
        ...latest.stock,
        conflicts_resolved: true,
        resolution_time: new Date().toISOString()
      }
    };
  }

  // For other fields: use highest _rev (automatic in Couchbase)
  return doc1;
}
```

---

## Phase 3: N1QL Query Endpoint

### 3.1 Server-Side N1QL Queries

**File:** `services/python-fast-api/src/routes/n1ql.py`

```python
from fastapi import APIRouter, Query
from couchbase.cluster import Cluster
from couchbase.auth import PasswordAuthenticator

router = APIRouter(prefix="/n1ql", tags=["n1ql"])

@router.get("/products/search")
async def search_products(
    query: str = Query(..., description="Search term"),
    category: str = Query(None),
    zone: str = Query(None),
    min_stock: int = Query(0),
    limit: int = Query(50, le=100)
):
    """Server-side search using N1QL for complex queries"""

    n1ql_query = """
    SELECT p.*, META(p).id as doc_id
    FROM ikea_products p
    WHERE p.type = 'product'
    """

    params = []

    # Full-text search
    if query:
        n1ql_query += " AND LOWER(p.search_text) LIKE $search"
        params.append(f"%{query.lower()}%")

    # Category filter
    if category:
        n1ql_query += " AND p.category = $category"
        params.append(category)

    # Location filter
    if zone:
        n1ql_query += " AND p.location.zone = $zone"
        params.append(zone)

    # Stock filter
    if min_stock > 0:
        n1ql_query += " AND p.stock.quantity >= $min_stock"
        params.append(min_stock)

    n1ql_query += " LIMIT $limit"
    params.append(limit)

    # Execute query
    cluster = get_couchbase_cluster()
    result = cluster.query(n1ql_query, *params)

    return {"products": [row for row in result]}


@router.get("/products/by-location")
async def products_by_location(
    zone: str,
    aisle: int = Query(None),
    radius_meters: float = Query(None)
):
    """Spatial queries for products near a location"""

    n1ql_query = """
    SELECT p.*
    FROM ikea_products p
    WHERE p.type = 'product'
      AND p.location.zone = $zone
    """

    if aisle:
        n1ql_query += " AND p.location.aisle = $aisle"

    if radius_meters:
        # Spatial query (requires geo index)
        n1ql_query += """
        AND SQRT(
          POWER(p.location.coordinates.x - $x, 2) +
          POWER(p.location.coordinates.y - $y, 2)
        ) <= $radius
        """

    n1ql_query += " ORDER BY p.location.aisle, p.location.bay"

    cluster = get_couchbase_cluster()
    result = cluster.query(n1ql_query, zone=zone, aisle=aisle, radius=radius_meters)

    return {"products": [row for row in result]}
```

### 3.2 Create N1QL Indexes

```sql
-- Primary index
CREATE PRIMARY INDEX ON ikea_products;

-- Search index
CREATE INDEX idx_search ON ikea_products(search_text) WHERE type = 'product';

-- Category index
CREATE INDEX idx_category ON ikea_products(category) WHERE type = 'product';

-- Location index
CREATE INDEX idx_location ON ikea_products(location.zone, location.aisle, location.bay)
WHERE type = 'product';

-- Stock index
CREATE INDEX idx_stock ON ikea_products(stock.quantity) WHERE type = 'product';

-- Composite index for common queries
CREATE INDEX idx_category_zone ON ikea_products(category, location.zone, stock.quantity)
WHERE type = 'product';
```

---

## Phase 4: Offline Queue Enhancement

### 4.1 Improve Offline Queue

**File:** `app/lib/couchbase/offline-queue.ts`

```typescript
interface QueuedOperation {
  id: string;
  type: 'stock_update' | 'scan_event';
  doc_id: string;
  changes: Partial<Product>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const database = useCouchbaseDatabase();

  // Queue a change
  const enqueue = async (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries' | 'status'>) => {
    const queueItem: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    // Store in local database
    await database.put({
      _id: `queue:${queueItem.id}`,
      type: 'queued_operation',
      ...queueItem
    });

    setQueue(prev => [...prev, queueItem]);
  };

  // Process queue when online
  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingOps = queue.filter(op => op.status === 'pending');

      for (const op of pendingOps) {
        try {
          // Apply change to local document
          const doc = await database.get(op.doc_id);
          const updated = { ...doc, ...op.changes };

          // This will trigger replication to server
          await database.put(updated);

          // Mark as synced
          await database.put({
            _id: `queue:${op.id}`,
            type: 'queued_operation',
            ...op,
            status: 'synced'
          });

          setQueue(prev => prev.map(q =>
            q.id === op.id ? { ...q, status: 'synced' } : q
          ));
        } catch (error) {
          console.error('Queue processing error:', error);

          // Increment retries
          const updatedOp = { ...op, retries: op.retries + 1 };
          if (updatedOp.retries >= 5) {
            updatedOp.status = 'failed';
          }

          await database.put({
            _id: `queue:${op.id}`,
            type: 'queued_operation',
            ...updatedOp
          });
        }
      }
    }, 5000); // Process every 5 seconds

    return () => clearInterval(interval);
  }, [queue, database]);

  return { queue, enqueue, pendingCount: queue.filter(q => q.status === 'pending').length };
}
```

### 4.2 Real-Time Sync Status

```typescript
// app/lib/couchbase/sync-status.ts
export function useSyncStatus() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null as Date | null,
    pendingChanges: 0,
    conflicts: 0
  });

  useEffect(() => {
    // Monitor replication status
    const replicator = getCouchbaseReplicator();

    replicator.addEventListener('change', (event) => {
      setStatus(prev => ({
        ...prev,
        isSyncing: event.status === 'active',
        lastSync: event.status === 'idle' ? new Date() : prev.lastSync
      }));
    });

    replicator.addEventListener('document', (event) => {
      if (event.flags.includes('conflict')) {
        setStatus(prev => ({ ...prev, conflicts: prev.conflicts + 1 }));
      }
    });

    // Monitor online status
    window.addEventListener('online', () => setStatus(prev => ({ ...prev, isOnline: true })));
    window.addEventListener('offline', () => setStatus(prev => ({ ...prev, isOnline: false })));
  }, []);

  return status;
}
```

---

## Phase 5: Client-Side Optimization

### 5.1 Smart Caching Strategy

```typescript
// app/lib/couchbase/cache.ts
export class ProductCache {
  private cache = new Map<string, { product: Product; timestamp: number }>();
  private readonly TTL = 1000 * 60 * 5; // 5 minutes

  get(articleNumber: string): Product | null {
    const entry = this.cache.get(articleNumber);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(articleNumber);
      return null;
    }

    return entry.product;
  }

  set(product: Product) {
    this.cache.set(product.article_number, {
      product,
      timestamp: Date.now()
    });
  }

  invalidate(articleNumber: string) {
    this.cache.delete(articleNumber);
  }

  clear() {
    this.cache.clear();
  }
}
```

### 5.2 Optimized Query Hooks

```typescript
// app/lib/couchbase/hooks/useProducts.ts
export function useProducts(filters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const database = useCouchbaseDatabase();
  const cache = useProductCache();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      // For simple queries: use local view
      if (!filters || isSimpleFilter(filters)) {
        const result = await database.query('products/by_category', {
          key: filters?.category,
          limit: 100
        });

        setProducts(result.rows.map(row => row.value));
      }
      // For complex queries: use N1QL endpoint
      else {
        const response = await fetch('/api/n1ql/products/search?' + new URLSearchParams(filters));
        const data = await response.json();
        setProducts(data.products);
      }

      setLoading(false);
    };

    fetchProducts();
  }, [filters, database]);

  return { products, loading };
}

function isSimpleFilter(filters: ProductFilters): boolean {
  // Simple filters can be handled by views
  return Object.keys(filters).length === 1 &&
         (filters.category || filters.zone);
}
```

---

## Phase 6: Environment Configuration

### 6.1 Configuration Module

**File:** `app/lib/config.ts`

```typescript
export const config = {
  couchbase: {
    // Edge (local)
    edgeUrl: import.meta.env.VITE_COUCHBASE_EDGE_URL || 'http://127.0.0.1:59840',
    edgeBucket: import.meta.env.VITE_COUCHBASE_BUCKET || 'ikea_products',

    // Sync Gateway
    syncGatewayUrl: import.meta.env.VITE_SYNC_GATEWAY_URL || 'ws://localhost:4984',
    syncChannels: (import.meta.env.VITE_SYNC_CHANNELS || 'store:001,products').split(','),

    // N1QL API
    n1qlApiUrl: import.meta.env.VITE_N1QL_API_URL || '/api/n1ql',
  },

  sync: {
    continuous: import.meta.env.VITE_SYNC_CONTINUOUS !== 'false',
    heartbeat: Number(import.meta.env.VITE_SYNC_HEARTBEAT) || 30000,
    retryDelay: Number(import.meta.env.VITE_SYNC_RETRY_DELAY) || 5000,
  },

  cache: {
    ttl: Number(import.meta.env.VITE_CACHE_TTL) || 300000, // 5 min
    maxItems: Number(import.meta.env.VITE_CACHE_MAX_ITEMS) || 500,
  }
};
```

### 6.2 Environment Files

**File:** `.env.development`
```env
VITE_COUCHBASE_EDGE_URL=http://127.0.0.1:59840
VITE_COUCHBASE_BUCKET=ikea_products
VITE_SYNC_GATEWAY_URL=ws://localhost:4984
VITE_SYNC_CHANNELS=store:001,products
VITE_N1QL_API_URL=/api/n1ql
VITE_SYNC_CONTINUOUS=true
```

**File:** `.env.production`
```env
VITE_COUCHBASE_EDGE_URL=http://edge.ikea-finder.local:59840
VITE_SYNC_GATEWAY_URL=wss://sync.ikea-finder.com:4984
VITE_SYNC_CHANNELS=store:001,products
VITE_N1QL_API_URL=https://api.ikea-finder.com/n1ql
```

---

## Implementation Timeline

```
Week 1: Document Design & Sync Gateway
├── Day 1: Optimize document schema
├── Day 2: Create MapReduce views
├── Day 3: Configure Sync Gateway
├── Day 4: Implement channel-based filtering
└── Day 5: Test conflict resolution

Week 2: N1QL & Server-Side Queries
├── Day 1-2: Create N1QL endpoints
├── Day 3: Add database indexes
├── Day 4: Optimize query performance
└── Day 5: Integration testing

Week 3: Offline Queue & Client Optimization
├── Day 1-2: Enhance offline queue
├── Day 3: Implement smart caching
├── Day 4: Add sync status monitoring
└── Day 5: Environment configuration

Week 4: Polish & Testing
├── Day 1-2: End-to-end testing
├── Day 3: Performance optimization
├── Day 4: Documentation
└── Day 5: Deployment preparation
```

---

## Migration Checklist

- [ ] Design optimized document schema
- [ ] Create MapReduce views for common queries
- [ ] Configure Sync Gateway with sync function
- [ ] Implement channel-based data filtering
- [ ] Create N1QL query endpoints
- [ ] Add database indexes for performance
- [ ] Enhance offline queue with retry logic
- [ ] Implement conflict resolution strategy
- [ ] Add smart caching layer
- [ ] Create sync status monitoring
- [ ] Externalize all configuration to env vars
- [ ] Update seeding scripts for new schema
- [ ] Test offline-to-online transitions
- [ ] Test sync conflict scenarios
- [ ] Performance test with 10K+ products

---

## Success Metrics

After optimization:
- [ ] Offline-first: App works 100% offline
- [ ] Sync latency: < 2 seconds for 100 documents
- [ ] Query performance: < 100ms for simple queries
- [ ] N1QL queries: < 500ms for complex searches
- [ ] Conflict resolution: Automatic with < 1% manual intervention
- [ ] Cache hit rate: > 80% for common operations
- [ ] Zero hardcoded URLs or credentials
- [ ] All config externalized to environment variables
