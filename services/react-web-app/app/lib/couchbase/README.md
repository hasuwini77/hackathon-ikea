# Couchbase Lite React Client

Offline-first data access layer for connecting React applications to Couchbase Edge Server.

## Overview

This library provides React hooks and utilities to interact with a local Couchbase Lite Edge Server instance, enabling offline-first product data access with automatic sync capabilities.

## Architecture

```
┌─────────────────┐
│  React App      │
│  (Components)   │
└────────┬────────┘
         │ uses hooks
         ▼
┌─────────────────┐
│  Hooks Layer    │
│  - useProduct   │
│  - useProducts  │
│  - useSyncStatus│
│  - useOfflineQueue│
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│  Client Layer   │
│  (REST calls)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Edge Server    │
│  :59840         │
└─────────────────┘
```

## Features

- **Offline-First**: Automatic retry logic and offline detection
- **Type Safety**: Full TypeScript support with product schema
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Network Resilience**: Timeout handling, retry with exponential backoff
- **Offline Queue**: Queue writes when offline, sync when back online
- **Sync Status**: Real-time connection monitoring
- **Search & Filter**: Client-side filtering with future N1QL support

## Installation

No external dependencies required beyond React and standard browser APIs.

## Quick Start

### 1. Fetch All Products

```typescript
import { useProducts } from '@/lib/couchbase';

function ProductList() {
  const { products, loading, error, isOffline } = useProducts();

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;
  if (isOffline) return <div>Offline - showing cached data</div>;

  return (
    <ul>
      {products.map(product => (
        <li key={product._id}>
          {product.name} - {product.price} {product.currency}
        </li>
      ))}
    </ul>
  );
}
```

### 2. Fetch Single Product

```typescript
import { useProduct } from '@/lib/couchbase';

function ProductDetail({ articleNumber }: { articleNumber: string }) {
  const { product, loading, error, refetch } = useProduct(
    articleNumber,
    true // Search by article number
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Price: {product.price} {product.currency}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### 3. Search & Filter Products

```typescript
import { useProducts } from '@/lib/couchbase';

function FilteredProducts() {
  const { products, loading } = useProducts({
    category: 'Furniture',
    minPrice: 100,
    maxPrice: 500,
    query: 'chair',
  });

  return (
    <div>
      <h2>Found {products.length} products</h2>
      {products.map(p => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}
```

### 4. Monitor Sync Status

```typescript
import { useSyncStatus } from '@/lib/couchbase';

function SyncIndicator() {
  const { isOnline, lastSynced, pendingChanges, error } = useSyncStatus({
    pollInterval: 10000, // Check every 10 seconds
  });

  return (
    <div className={isOnline ? 'online' : 'offline'}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
      {pendingChanges > 0 && ` - ${pendingChanges} pending changes`}
      {lastSynced && <small>Last synced: {lastSynced.toLocaleTimeString()}</small>}
    </div>
  );
}
```

### 5. Offline Write Queue

```typescript
import { useOfflineQueue } from '@/lib/couchbase';

function ProductEditor({ productId }: { productId: string }) {
  const { queueWrite, pendingCount } = useOfflineQueue();

  async function handleSave(updatedProduct: ProductDocument) {
    try {
      await queueWrite(
        productId,
        updatedProduct,
        updatedProduct._rev // Include revision for updates
      );
      alert('Product saved! Will sync when online.');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  }

  return (
    <div>
      {pendingCount > 0 && (
        <div className="warning">
          {pendingCount} changes pending sync
        </div>
      )}
      {/* Editor form */}
    </div>
  );
}
```

## API Reference

### Hooks

#### `useProduct(identifier, isArticleNumber)`

Fetch a single product by ID or article number.

**Parameters:**
- `identifier: string | undefined` - Document ID or article number
- `isArticleNumber: boolean` - If true, searches by article number (default: false)

**Returns:**
```typescript
{
  product: ProductDocument | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}
```

#### `useProducts(options)`

Fetch multiple products with optional filtering.

**Parameters:**
```typescript
{
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string; // Search in name, description, article number, tags
}
```

**Returns:**
```typescript
{
  products: ProductDocument[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  refetch: () => void;
}
```

#### `useSyncStatus(options)`

Monitor Edge Server connectivity and sync status.

**Parameters:**
```typescript
{
  pollInterval?: number; // Default: 10000ms
  enabled?: boolean; // Default: true
}
```

**Returns:**
```typescript
{
  isOnline: boolean;
  lastSynced?: Date;
  pendingChanges: number;
  error?: string;
  refetch: () => void;
}
```

#### `useOfflineQueue()`

Manage offline write operations with automatic retry.

**Returns:**
```typescript
{
  queuedOperations: QueuedOperation[];
  pendingCount: number;
  queueWrite: (docId, document, rev?) => Promise<void>;
  queueDelete: (docId, rev) => Promise<void>;
  retryAll: () => Promise<void>;
  clearQueue: () => void;
}
```

### Client Functions

Low-level functions for direct API access (use hooks instead when possible):

```typescript
// Document operations
getDocument(docId: string): Promise<CouchbaseDocument>
putDocument(docId: string, document: Omit<CouchbaseDocument, '_id'>, rev?: string)
deleteDocument(docId: string, rev: string)

// Querying
getAllDocuments(includeDocs?: boolean): Promise<AllDocsResponse>
searchProducts(params: SearchParams): Promise<ProductDocument[]>

// Status
checkServerStatus(): Promise<boolean>
getDatabaseInfo(): Promise<DatabaseInfo>
```

## Type Definitions

### ProductDocument

```typescript
interface ProductDocument extends CouchbaseDocument {
  articleNumber: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: string;
  };
  stock?: {
    quantity: number;
    location?: string;
  };
  images?: string[];
  tags?: string[];
  lastUpdated?: string;
}
```

## Configuration

Default configuration in `config.ts`:

```typescript
EDGE_SERVER_URL = 'http://127.0.0.1:59840'
DATABASE_NAME = 'ikea_products'
REQUEST_TIMEOUT = 5000 // 5 seconds
SYNC_STATUS_POLL_INTERVAL = 10000 // 10 seconds
RETRY_ATTEMPTS = 3
RETRY_DELAY = 1000 // 1 second
```

## Error Handling

The library provides comprehensive error handling:

```typescript
try {
  await putDocument(id, data);
} catch (err) {
  if (err instanceof CouchbaseClientError) {
    console.log(err.message); // User-friendly message
    console.log(err.status); // HTTP status code
    console.log(err.isOffline); // Network failure flag
  }
}
```

### Common Errors

- **404**: Document not found (handled gracefully)
- **409**: Revision conflict (need to fetch latest and merge)
- **Network errors**: Automatically detected as offline state
- **Timeout**: Server unreachable, marked as offline

## Best Practices

1. **Use Hooks Over Client Functions**: Hooks provide automatic error handling and state management

2. **Handle Offline State Gracefully**:
   ```typescript
   if (isOffline) {
     return <div>Viewing cached data - you're offline</div>;
   }
   ```

3. **Show Pending Changes**:
   ```typescript
   const { pendingCount } = useOfflineQueue();
   {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
   ```

4. **Provide Manual Refresh**:
   ```typescript
   const { refetch } = useProducts();
   <button onClick={refetch}>Refresh</button>
   ```

5. **Handle Revision Conflicts**:
   ```typescript
   try {
     await putDocument(id, data, currentRev);
   } catch (err) {
     if (err.status === 409) {
       // Fetch latest, merge changes, retry
     }
   }
   ```

## Testing Offline Behavior

1. **Simulate Server Down**: Stop Edge Server
   ```bash
   # Library will automatically detect and mark as offline
   ```

2. **Network Throttling**: Use browser DevTools to simulate slow connections

3. **Test Queue**:
   ```typescript
   // Make changes while offline
   await queueWrite(id, data);

   // Come back online
   // Queue automatically processes
   ```

## Performance Considerations

- **Client-Side Filtering**: Current implementation filters after fetching all docs. For large datasets, consider using Couchbase N1QL queries on the Edge Server.

- **Polling Intervals**: Adjust `pollInterval` based on your needs:
  - Frequent updates: 5000ms (more battery usage)
  - Normal usage: 10000ms (recommended)
  - Battery saving: 30000ms

- **Caching**: Browser automatically caches responses. Use `refetch()` to force refresh.

## Future Enhancements

- [ ] N1QL query support for server-side filtering
- [ ] Real-time sync with WebSocket notifications
- [ ] Optimistic UI updates with automatic rollback
- [ ] Conflict resolution strategies
- [ ] Background sync API integration
- [ ] IndexedDB cache layer
- [ ] Pagination support for large datasets

## Troubleshooting

### "Network error - unable to reach Edge Server"
- Ensure Edge Server is running on port 59840
- Check firewall settings
- Verify database exists

### Products not updating after changes
- Call `refetch()` to force refresh
- Check browser cache
- Verify revision numbers match

### Offline queue not processing
- Check network connectivity
- Look for client errors (4xx) that prevent retry
- Clear queue and retry: `clearQueue()`

## License

Part of the IKEA Hackathon project.
