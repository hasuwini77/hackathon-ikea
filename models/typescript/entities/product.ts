/**
 * Product Entity - IKEA Product Data Model
 *
 * Represents a product in the IKEA warehouse with location, stock, and pricing information.
 * Designed for offline-first sync with Couchbase Lite.
 */

export interface ProductStock {
  /** Current stock quantity */
  quantity: number;
  /** Stock location identifier (e.g., "LIVING_ROOM", "BEDROOM") */
  location: string;
}

export interface ProductDimensions {
  /** Depth in specified unit */
  depth: number;
  /** Width in specified unit */
  width: number;
  /** Height in specified unit */
  height: number;
  /** Unit of measurement (e.g., "cm", "in") */
  unit: string;
}

export interface Product {
  /** Document ID in format "product:702.758.14" */
  _id: string;

  /** Couchbase revision for conflict resolution */
  _rev?: string;

  /** Document type discriminator */
  type: "product";

  /** IKEA article number (e.g., "702.758.14") */
  articleNumber: string;

  /** Product name (e.g., "KALLAX") */
  name: string;

  /** Product description (e.g., "Shelf unit") */
  description: string;

  /** Product category */
  category: string;

  /** Product type/subcategory */
  productType: string;

  /** Product price */
  price: number;

  /** Currency code (e.g., "SEK", "USD") */
  currency: string;

  /** Stock information */
  stock: ProductStock;

  /** Product dimensions */
  dimensions: ProductDimensions;

  /** Product weight in kg */
  weight: number;

  /** Product tags/attributes */
  tags: string[];

  /** Whether assembly is required */
  assemblyRequired: boolean;

  /** Whether product is in stock */
  inStock: boolean;

  /** ISO 8601 timestamp of last update */
  lastUpdated: string;

  /** ISO 8601 timestamp of last sync with backend */
  _syncedAt?: string;

  /** Flag indicating pending changes to sync */
  _pendingSync?: boolean;
}

/**
 * Type guard to check if an object is a Product
 */
export function isProduct(obj: any): obj is Product {
  return (
    obj &&
    typeof obj._id === 'string' &&
    obj.type === 'product' &&
    typeof obj.articleNumber === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.productType === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.currency === 'string' &&
    obj.stock &&
    typeof obj.stock.quantity === 'number' &&
    typeof obj.stock.location === 'string' &&
    obj.dimensions &&
    typeof obj.dimensions.depth === 'number' &&
    typeof obj.dimensions.width === 'number' &&
    typeof obj.dimensions.height === 'number' &&
    typeof obj.dimensions.unit === 'string' &&
    typeof obj.weight === 'number' &&
    Array.isArray(obj.tags) &&
    typeof obj.assemblyRequired === 'boolean' &&
    typeof obj.inStock === 'boolean' &&
    typeof obj.lastUpdated === 'string'
  );
}

/**
 * Creates a Product document ID from an article number
 */
export function createProductId(articleNumber: string): string {
  return `product:${articleNumber}`;
}

/**
 * Extracts article number from a Product document ID
 */
export function getArticleNumberFromId(productId: string): string {
  return productId.replace('product:', '');
}
