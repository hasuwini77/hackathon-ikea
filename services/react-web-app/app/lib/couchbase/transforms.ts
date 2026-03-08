/**
 * Transform functions to convert between Couchbase document format
 * and UI component expected format
 */

import type { ProductDocument } from './types';
import type { Product, UIProductLocation } from '~/types/product';

function normalizeZone(zoneValue?: string): string | undefined {
  if (!zoneValue) return undefined;
  const zone = zoneValue.toLowerCase();
  if (zone.includes('showroom')) return 'showroom';
  if (zone.includes('market')) return 'market';
  if (zone.includes('warehouse')) return 'warehouse';
  return undefined;
}

/**
 * Parse stock location from Couchbase document to UI location format
 * The Couchbase document has separate zone, aisle, bay, section fields
 * at the top level, which we transform into the UI location format
 */
function parseStockLocation(doc: ProductDocument): UIProductLocation {
  const normalizedZone = normalizeZone(doc.zone);

  // Prefer top-level location fields (actual format from Couchbase)
  if (doc.zone !== undefined || doc.aisle !== undefined || doc.bay !== undefined || doc.section !== undefined) {
    return {
      zone: normalizedZone,
      aisle: String(doc.aisle ?? doc.zone ?? 'N/A'),
      bay: String(doc.bay ?? 'N/A'),
      section: String(doc.section ?? 'N/A'),
    };
  }

  // Fallback: Parse from stock.location string if stock is an object with location
  if (typeof doc.stock === 'object' && 'location' in doc.stock) {
    const locationString = doc.stock.location;

  // Try comma-separated format first (e.g., "A,12,3") - unambiguous
  const commaParts = locationString.split(',');
  if (commaParts.length === 3) {
    return {
      aisle: commaParts[0].trim(),
      bay: commaParts[1].trim(),
      section: commaParts[2].trim(),
    };
  }

  // Try hyphen-separated format (e.g., "A-12-3" or "market-cookshop-36-1-B")
  const hyphenParts = locationString.split('-');
  if (hyphenParts.length >= 3) {
    // Find where numeric parts start (aisle typically is or contains a number)
    // Look for pattern where we have number-number-letter or number-number-number at the end
    const len = hyphenParts.length;

    // Check if last 3 parts look like aisle-bay-section
    const potentialAisle = hyphenParts[len - 3];
    const potentialBay = hyphenParts[len - 2];
    const potentialSection = hyphenParts[len - 1];

    // If the potential aisle has a number or is a single letter (like "A")
    const hasNumericAisle = /\d/.test(potentialAisle) || /^[A-Z]$/i.test(potentialAisle);

    if (hasNumericAisle) {
      return {
        aisle: potentialAisle.trim(),
        bay: potentialBay.trim(),
        section: potentialSection.trim(),
      };
    }

    // Otherwise just take last 3 parts
    return {
      aisle: potentialAisle.trim(),
      bay: potentialBay.trim(),
      section: potentialSection.trim(),
    };
  }

  // Simple format with just hyphens (e.g., "15-3-A")
  if (hyphenParts.length === 3) {
    return {
      aisle: hyphenParts[0].trim(),
      bay: hyphenParts[1].trim(),
      section: hyphenParts[2].trim(),
    };
  }

    // Default: treat as a zone/area name
    return {
      zone: normalizeZone(locationString),
      aisle: locationString,
      bay: 'N/A',
      section: 'N/A',
    };
  }

  // If stock is a number or has no location, return default
  return {
    zone: normalizedZone,
    aisle: 'N/A',
    bay: 'N/A',
    section: 'N/A',
  };
}

/**
 * Format UI location back to Couchbase document format
 * Note: We preserve the top-level fields in the return value
 */
function formatLocationToDocument(location: UIProductLocation): {
  zone?: string;
  aisle?: number | string;
  bay?: number | string;
  section?: string;
  stockLocation: string;
} {
  // Try to parse aisle as number if possible
  const aisleNum = parseInt(String(location.aisle), 10);
  const bayNum = parseInt(String(location.bay), 10);

  // Create stock location string
  let stockLocation: string;
  if (location.bay === 'N/A' && location.section === 'N/A') {
    stockLocation = location.aisle;
  } else {
    stockLocation = `${location.aisle}-${location.bay}-${location.section}`;
  }

  return {
    zone: location.zone,
    aisle: isNaN(aisleNum) ? location.aisle : aisleNum,
    bay: isNaN(bayNum) ? location.bay : bayNum,
    section: location.section !== 'N/A' ? location.section : undefined,
    stockLocation,
  };
}

/**
 * Normalize weight to a number (handle both object and number formats)
 */
function normalizeWeight(weight: any): number {
  if (typeof weight === 'number') {
    return weight;
  }
  if (weight && typeof weight === 'object' && typeof weight.value === 'number') {
    return weight.value;
  }
  return 0;
}

/**
 * Convert Couchbase Product document to UI Product format
 * Transforms the data structure to be UI-friendly
 */
export function productDocumentToProduct(doc: ProductDocument): Product {
  // Normalize stock to always get quantity
  const stockQuantity = typeof doc.stock === 'number' ? doc.stock : doc.stock.quantity;

  // Ensure _id is always set - use articleNumber as fallback for uniqueness
  const productId = doc._id || `product:${doc.articleNumber}`;

  return {
    _id: productId,
    _rev: doc._rev,
    type: doc.type,
    articleNumber: doc.articleNumber,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    productType: doc.productType,
    price: doc.price,
    currency: doc.currency,
    dimensions: {
      depth: doc.dimensions.depth ?? 0,
      width: doc.dimensions.width ?? 0,
      height: doc.dimensions.height ?? 0,
      unit: doc.dimensions.unit,
    },
    weight: normalizeWeight(doc.weight),
    tags: doc.tags || [],
    assemblyRequired: doc.assemblyRequired ?? false,
    inStock: doc.inStock,
    lastUpdated: doc.lastUpdated,
    _syncedAt: doc._syncedAt,
    _pendingSync: doc._pendingSync,

    // Transform location from Couchbase format to UI format
    location: parseStockLocation(doc),

    // Transform stock with lastChecked instead of location
    stock: {
      quantity: stockQuantity,
      lastChecked: doc.lastUpdated,
    },

    // UI-specific fields
    imageUrl: undefined,
    hasPendingChanges: doc._pendingSync || false,
  };
}

/**
 * Convert UI Product format to Couchbase Product document
 * Transforms UI format back to Couchbase storage format
 * Always stores stock as an object with quantity and location for consistency
 */
export function productToProductDocument(product: Product): ProductDocument {
  const locationData = formatLocationToDocument(product.location);

  return {
    _id: product._id,
    _rev: product._rev,
    type: product.type,
    articleNumber: product.articleNumber,
    name: product.name,
    description: product.description,
    category: product.category,
    productType: product.productType,
    price: product.price,
    currency: product.currency,
    dimensions: product.dimensions,
    weight: product.weight,
    tags: product.tags,
    assemblyRequired: product.assemblyRequired,
    inStock: product.inStock,
    lastUpdated: product.stock.lastChecked,
    _syncedAt: product._syncedAt,
    _pendingSync: product._pendingSync,

    // Store location in both formats for compatibility
    // Always use object format when writing to ensure consistency
    stock: {
      quantity: product.stock.quantity,
      location: locationData.stockLocation,
    },

    // Top-level location fields
    zone: locationData.zone,
    aisle: locationData.aisle,
    bay: locationData.bay,
    section: locationData.section,
  };
}

/**
 * Batch convert array of Couchbase ProductDocuments to UI Products
 */
export function productDocumentsToProducts(docs: ProductDocument[]): Product[] {
  return docs.map(productDocumentToProduct);
}
