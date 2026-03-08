/**
 * Product Types for IKEA Staff Product Finder
 * Self-contained types for the React app
 */

// Base types matching Couchbase document structure
export interface ProductStock {
  quantity: number;
  location: string;
}

export interface ProductDimensions {
  depth: number;
  width: number;
  height: number;
  unit: string;
}

/**
 * Base Product type matching Couchbase document structure
 */
export interface BaseProduct {
  _id: string;
  _rev?: string;
  type: "product";
  articleNumber: string;
  name: string;
  description: string;
  category: string;
  productType: string;
  price: number;
  currency: string;
  stock: ProductStock;
  dimensions: ProductDimensions;
  weight: number;
  tags: string[];
  assemblyRequired: boolean;
  inStock: boolean;
  lastUpdated: string;
  _syncedAt?: string;
  _pendingSync?: boolean;
}

/**
 * UI-specific location format for warehouse navigation
 */
export interface UIProductLocation {
  zone?: string;
  aisle: string;
  bay: string;
  section: string;
}

/**
 * UI-specific stock format with lastChecked timestamp
 */
export interface UIProductStock {
  quantity: number;
  lastChecked: string;
}

/**
 * Product type for UI components
 * Combines the base Product type with UI-optimized fields for display
 */
export interface Product extends Omit<BaseProduct, 'stock'> {
  location: UIProductLocation;
  stock: UIProductStock;
  imageUrl?: string;
  hasPendingChanges?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncError?: string;
}
