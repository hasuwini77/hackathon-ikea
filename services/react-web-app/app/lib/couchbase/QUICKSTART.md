# Quick Start Guide - Couchbase React Client

Get up and running with offline-first product data in 5 minutes.

## Prerequisites

1. Couchbase Edge Server running on port 59840
2. Database named `ikea_products` exists
3. React application ready

## Step 1: Import the Hook

```typescript
import { useProducts } from '@/lib/couchbase';
```

## Step 2: Use in Your Component

```typescript
function ProductList() {
  const { products, loading, error } = useProducts();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

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

## Step 3: Run Your App

That's it! The hook handles:
- Network requests
- Error handling
- Offline detection
- Retry logic
- Type safety

## Common Use Cases

### Get Single Product

```typescript
import { useProduct } from '@/lib/couchbase';

function ProductDetail({ articleNumber }) {
  const { product, loading, error } = useProduct(articleNumber, true);

  if (!product) return <div>Not found</div>;
  return <div>{product.name}</div>;
}
```

### Search Products

```typescript
import { useProducts } from '@/lib/couchbase';

function SearchPage() {
  const { products } = useProducts({
    category: 'Furniture',
    minPrice: 100,
    query: 'chair'
  });

  return <div>Found {products.length} products</div>;
}
```

### Show Offline Status

```typescript
import { useSyncStatus } from '@/lib/couchbase';

function StatusBar() {
  const { isOnline, pendingChanges } = useSyncStatus();

  return (
    <div>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
      {pendingChanges > 0 && ` - ${pendingChanges} pending`}
    </div>
  );
}
```

### Save Changes Offline

```typescript
import { useOfflineQueue } from '@/lib/couchbase';

function EditProduct({ product }) {
  const { queueWrite } = useOfflineQueue();

  async function handleSave(updatedData) {
    await queueWrite(product._id, updatedData, product._rev);
    alert('Saved! Will sync when online.');
  }

  return <button onClick={handleSave}>Save</button>;
}
```

## Next Steps

1. Read [README.md](./README.md) for complete API documentation
2. Check [examples.tsx](./examples.tsx) for full component examples
3. Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details

## Troubleshooting

**"Network error - unable to reach Edge Server"**
- Is Edge Server running? Check `http://127.0.0.1:59840`
- Is database created? Check `/ikea_products`

**Products not loading**
- Open browser console for errors
- Check Network tab for failed requests
- Verify Edge Server logs

**Changes not saving**
- Check `pendingCount` from `useOfflineQueue()`
- Verify you're online
- Check for revision conflicts (409 errors)

## Need Help?

- Documentation: See README.md
- Examples: See examples.tsx
- Issues: Check browser console and Edge Server logs
