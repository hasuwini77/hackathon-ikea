# Couchbase React Hooks - Fixes Applied

## Summary
Fixed and enhanced React hooks that connect to Couchbase Edge Server to properly handle the actual document format and ensure offline-first functionality.

## Issues Fixed

### 1. Document Format Mismatch
**Problem**: The transforms expected `stock.location` as a simple string, but actual documents have separate top-level fields (`zone`, `aisle`, `bay`, `section`).

**Solution**: Updated `transforms.ts` to:
- Parse location from top-level `zone`, `aisle`, `bay`, `section` fields (primary)
- Fallback to parsing `stock.location` string for backwards compatibility
- Handle multi-part location strings like "market-cookshop-36-1-B"

### 2. Weight Field Type Mismatch
**Problem**: Actual documents have `weight` as `{value: number, unit: string}` but type definition expected simple `number`.

**Solution**:
- Updated `ProductDocument` type to accept `weight: ProductWeight | number`
- Added `normalizeWeight()` function in transforms to handle both formats
- Defaults to 0 if weight is invalid

### 3. Missing Type Filter
**Problem**: `getAllDocuments()` and `searchProducts()` returned all document types, not just products.

**Solution**: Added filter to only include documents where `type === 'product'`:
```typescript
.filter(row => row.doc && row.doc.type === 'product')
```

### 4. Search Performance Issue
**Problem**: Client-side filtering doesn't scale, and price filters didn't handle undefined values.

**Solution**:
- Added null checks for price filtering
- Added comments noting this is client-side filtering (N1QL recommended for production)
- Optimized filters to check field existence before comparison

### 5. Product Lookup by Article Number
**Problem**: `useProduct` hook used inefficient `searchProducts()` to find by article number.

**Solution**:
- Changed to construct document ID directly: `product:${articleNumber}`
- Much faster - single document GET instead of scanning all documents
- Added `createProductId()` helper function to client

### 6. Dimension Null Handling
**Problem**: Some products have `null` values for dimensions (e.g., `depth: null`).

**Solution**: Added null coalescing in transform:
```typescript
dimensions: {
  depth: doc.dimensions.depth ?? 0,
  width: doc.dimensions.width ?? 0,
  height: doc.dimensions.height ?? 0,
  unit: doc.dimensions.unit,
}
```

### 7. Missing assemblyRequired Field
**Problem**: Actual documents don't have `assemblyRequired` field.

**Solution**: Made field optional and default to `false`:
```typescript
assemblyRequired: doc.assemblyRequired ?? false
```

### 8. Offline Queue Integration
**Problem**: Stock updates didn't properly preserve all document fields.

**Solution**: `useUpdateStock` now:
- Fetches current document first
- Preserves all fields using spread operator
- Only updates `stock.quantity` and `lastUpdated`
- Uses offline queue for resilient updates

## Files Modified

### `/app/lib/couchbase/types.ts`
- Redefined `ProductDocument` to match actual Couchbase format
- Added `ProductWeight` interface
- Made fields optional/nullable where appropriate
- Added `zone`, `aisle`, `bay`, `section`, `subcategory` fields

### `/app/lib/couchbase/transforms.ts`
- Complete rewrite to handle actual document format
- Added `parseStockLocation()` to extract location from multiple formats
- Added `formatLocationToDocument()` to preserve both formats on write
- Added `normalizeWeight()` to handle weight object vs number
- Improved null handling throughout

### `/app/lib/couchbase/client.ts`
- Added type filter to `searchProducts()`
- Added null checks for price filtering
- Added `createProductId()` helper
- Added `getArticleNumberFromId()` helper

### `/app/lib/couchbase/hooks/useProducts.ts`
- Added type filter to `getAllDocuments()` call

### `/app/lib/couchbase/hooks/useProduct.ts`
- Simplified to use direct document ID lookup
- Removed inefficient search-based approach
- Uses `createProductId()` for article number lookups

### `/app/lib/couchbase/index.ts`
- Exported new helper functions

## Testing

### Verified Against Real Data
All fixes tested against actual Couchbase Edge Server data:
```bash
curl -s "http://127.0.0.1:59840/ikea_products/_all_docs?include_docs=true&limit=1"
```

Example document structure confirmed:
```json
{
  "_id": "product:001.391.36",
  "type": "product",
  "articleNumber": "001.391.36",
  "name": "IKEA 365+",
  "zone": "market-cookshop",
  "aisle": 36,
  "bay": 1,
  "section": "B",
  "stock": {
    "location": "market-cookshop-36-1-B",
    "quantity": 72
  },
  "weight": {
    "value": 2,
    "unit": "kg"
  },
  "dimensions": {
    "depth": null,
    "width": 24,
    "height": 14,
    "unit": "cm"
  }
}
```

### Test Transform Script
Created `/app/lib/couchbase/test-transforms.ts` to verify transforms work correctly with real data.

## Document ID Format
Confirmed format: `product:ARTICLE_NUMBER`
- Example: `product:001.391.36`
- Example: `product:002.638.50`

## Field Mapping

| Couchbase Field | UI Product Field | Notes |
|----------------|------------------|-------|
| `zone` | `location.aisle` | Zone maps to aisle for display |
| `aisle` | `location.aisle` | Preferred if zone not present |
| `bay` | `location.bay` | Numeric or string |
| `section` | `location.section` | Letter code |
| `stock.quantity` | `stock.quantity` | Direct mapping |
| `stock.location` | - | Redundant string, not used in UI |
| `lastUpdated` | `stock.lastChecked` | Timestamp mapping |
| `weight.value` | `weight` | Normalized to number |
| `dimensions.depth` | `dimensions.depth` | Null → 0 |

## Offline Queue Behavior

1. **Online**: Updates execute immediately
2. **Offline**: Operations queued in localStorage
3. **Reconnect**: Auto-retry queued operations
4. **Conflict**: Drop operation (revision mismatch)
5. **Max Retries**: 5 attempts, then drop

## Performance Considerations

### Current (Client-side filtering)
- Simple to implement
- Works for small datasets (< 1000 products)
- All documents fetched on every search

### Recommended (Production)
- Use Couchbase N1QL queries for server-side filtering
- Create indexes on frequently searched fields
- Implement pagination for large result sets

## Usage Examples

### Fetch all products
```typescript
const { products, loading, error } = useProducts();
```

### Search products
```typescript
const { products } = useProducts({
  category: 'Storage',
  minPrice: 100,
  maxPrice: 1000,
  query: 'BILLY'
});
```

### Get single product by article number
```typescript
const { product } = useProduct('002.638.50', true);
```

### Get product by document ID
```typescript
const { product } = useProduct('product:002.638.50', false);
```

### Update stock
```typescript
const { updateStock } = useUpdateStock();
await updateStock('product:002.638.50', 45);
```

## Backwards Compatibility

The transforms handle multiple document formats:
1. New format: Top-level `zone`, `aisle`, `bay`, `section`
2. Old format: Only `stock.location` string
3. Weight as object or number
4. Optional fields with sensible defaults

This ensures the hooks work with both old and new document formats.
