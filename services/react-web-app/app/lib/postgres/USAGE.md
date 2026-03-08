# PostgreSQL API Integration - Usage Guide

This module provides React hooks to fetch and update products from the PostgreSQL backend via FastAPI.

## Quick Start

### 1. Fetch All Products

```tsx
import { usePostgresProducts } from '~/lib/postgres';

function ProductList() {
  const { products, loading, error, isOffline, refetch } = usePostgresProducts();

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;
  if (isOffline) return <div>Offline - showing cached data</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {products.map(product => (
        <div key={product._id}>{product.name} - ${product.price}</div>
      ))}
    </div>
  );
}
```

### 2. Search and Filter Products

```tsx
import { usePostgresProducts } from '~/lib/postgres';

function SearchProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [zone, setZone] = useState('');

  const { products, loading, error } = usePostgresProducts(
    searchTerm,
    category,
    zone
  );

  return (
    <div>
      <input
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All Categories</option>
        <option value="Storage">Storage</option>
        <option value="Furniture">Furniture</option>
      </select>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {products.map(product => (
            <div key={product._id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Fetch Single Product

```tsx
import { usePostgresProduct } from '~/lib/postgres';

function ProductDetail({ articleNumber }: { articleNumber: string }) {
  const { product, loading, error, isOffline } = usePostgresProduct(articleNumber);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Price: {product.price} {product.currency}</p>
      <p>Stock: {product.stock.quantity}</p>
      <p>Location: {product.location.aisle}-{product.location.bay}-{product.location.section}</p>
      {isOffline && <div>⚠️ Showing cached data (offline)</div>}
    </div>
  );
}
```

### 4. Update Stock

```tsx
import { usePostgresUpdateStock, usePostgresProduct } from '~/lib/postgres';

function StockUpdater({ articleNumber }: { articleNumber: string }) {
  const { product, refetch } = usePostgresProduct(articleNumber);
  const { updateStock, updating, error } = usePostgresUpdateStock();
  const [newQuantity, setNewQuantity] = useState(0);

  const handleUpdate = async () => {
    try {
      await updateStock(articleNumber, newQuantity);
      refetch(); // Refresh the product data
      alert('Stock updated successfully!');
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  return (
    <div>
      <h2>{product?.name}</h2>
      <p>Current stock: {product?.stock.quantity}</p>

      <input
        type="number"
        min="0"
        value={newQuantity}
        onChange={(e) => setNewQuantity(parseInt(e.target.value))}
      />

      <button onClick={handleUpdate} disabled={updating}>
        {updating ? 'Updating...' : 'Update Stock'}
      </button>

      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## API Reference

### `usePostgresProducts(searchTerm?, category?, zone?)`

Fetches a list of products with optional filtering.

**Parameters:**
- `searchTerm` (optional): Search term for product name, description, or article number
- `category` (optional): Filter by category
- `zone` (optional): Filter by warehouse zone

**Returns:**
- `products`: Array of Product objects
- `loading`: Boolean indicating loading state
- `error`: Error message string or null
- `isOffline`: Boolean indicating if the error was due to being offline
- `refetch()`: Function to manually refresh the data

### `usePostgresProduct(articleNumber)`

Fetches a single product by article number.

**Parameters:**
- `articleNumber`: The IKEA article number (e.g., "123.456.78")

**Returns:**
- `product`: Product object or null
- `loading`: Boolean indicating loading state
- `error`: Error message string or null
- `isOffline`: Boolean indicating if the error was due to being offline
- `refetch()`: Function to manually refresh the data

### `usePostgresUpdateStock()`

Hook for updating product stock quantity.

**Returns:**
- `updateStock(articleNumber, quantity)`: Async function to update stock
- `updating`: Boolean indicating if an update is in progress
- `error`: Error message string or null

**Note:** This hook directly updates the PostgreSQL database and does NOT support offline queueing. For offline support, use the Couchbase hooks instead.

## Offline Behavior

All hooks handle offline scenarios gracefully:

1. **Network Errors**: When the API is unavailable, hooks set `isOffline: true` and preserve existing data
2. **Error Messages**: User-friendly error messages are provided
3. **Cached Data**: Existing data is retained on error, allowing the UI to show stale data
4. **No Offline Queue**: Unlike Couchbase hooks, these hooks do NOT queue operations for later sync

## Type Conversion

The PostgreSQL API returns products in a different format than the app's internal `Product` type. The hooks automatically transform:

- `PostgresProduct` (from API) → `Product` (for UI components)
- Warehouse location (zone, aisle, bay, section) → UI location format
- Stock fields → UI stock format with lastChecked timestamp
- Dimensions → UI dimensions format

## Vite Proxy Configuration

The `/api/postgres` path is proxied to `http://127.0.0.1:8000` (FastAPI default port) in development. This is configured in `vite.config.ts`.

## Comparison with Couchbase Hooks

| Feature | PostgreSQL Hooks | Couchbase Hooks |
|---------|-----------------|-----------------|
| Data Source | PostgreSQL (via FastAPI) | Couchbase Lite (via Edge Server) |
| Offline Support | Read-only (shows cached data) | Full offline queue for writes |
| Sync | Direct API calls | Automatic sync via Couchbase |
| Use Case | Server-side data access | Offline-first mobile scenarios |
| Stock Updates | Immediate (no queue) | Queued when offline |

## Best Practices

1. **Use for server data**: Use PostgreSQL hooks when you need fresh data from the server
2. **Offline scenarios**: For offline-first functionality, use Couchbase hooks
3. **Error handling**: Always check the `error` and `isOffline` states
4. **Refetch after updates**: Call `refetch()` after updating stock to get fresh data
5. **Loading states**: Show appropriate loading UI while `loading` is true
