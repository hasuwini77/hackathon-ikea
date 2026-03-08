/**
 * Stock Level Color Utilities
 *
 * Centralized color scheme and utility functions for stock level visualization
 * Used across store map components for consistent stock status indicators
 */

// Stock level color scheme - matching Tailwind colors for consistency
export const STOCK_COLORS = {
  outOfStock: '#ef4444',  // red-500
  lowStock: '#f59e0b',    // amber-500
  inStock: '#22c55e',     // green-500
} as const;

// Stock level thresholds
export const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK_MAX: 10,
  IN_STOCK_MIN: 11,
} as const;

// Stock level labels
export const STOCK_LABELS = {
  outOfStock: 'Out of Stock',
  lowStock: 'Low Stock',
  inStock: 'In Stock',
} as const;

/**
 * Get the appropriate color for a given stock level
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Hex color code
 */
export function getStockColor(stockLevel: number = 0): string {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) {
    return STOCK_COLORS.outOfStock;
  }
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) {
    return STOCK_COLORS.lowStock;
  }
  return STOCK_COLORS.inStock;
}

/**
 * Get the stock status label for a given stock level
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Human-readable status label
 */
export function getStockLabel(stockLevel: number = 0): string {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) {
    return STOCK_LABELS.outOfStock;
  }
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) {
    return STOCK_LABELS.lowStock;
  }
  return STOCK_LABELS.inStock;
}

/**
 * Get a detailed stock description with count
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Formatted description
 */
export function getStockDescription(stockLevel: number = 0): string {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) {
    return `${STOCK_LABELS.outOfStock} (0 units)`;
  }
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) {
    return `${STOCK_LABELS.lowStock} (${stockLevel} ${stockLevel === 1 ? 'unit' : 'units'})`;
  }
  return `${STOCK_LABELS.inStock} (${stockLevel} units)`;
}

/**
 * Check if a stock level indicates out of stock
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns True if out of stock
 */
export function isOutOfStock(stockLevel: number = 0): boolean {
  return stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK;
}

/**
 * Check if a stock level is considered low
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns True if low stock
 */
export function isLowStock(stockLevel: number = 0): boolean {
  return stockLevel > STOCK_THRESHOLDS.OUT_OF_STOCK && stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX;
}

/**
 * Check if a stock level is considered good/in stock
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns True if in stock
 */
export function isInStock(stockLevel: number = 0): boolean {
  return stockLevel >= STOCK_THRESHOLDS.IN_STOCK_MIN;
}

/**
 * Get the appropriate marker radius for a stock level
 * Slightly larger markers for better visibility when stock is good
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Radius in pixels
 */
export function getStockRadius(stockLevel: number = 0): number {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) {
    return 5;
  }
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) {
    return 5.5;
  }
  return 6;
}

/**
 * Stock filter type definition
 */
export type StockFilter = 'all' | 'out' | 'low' | 'good';

/**
 * Filter products based on stock level filter
 * @param stockLevel - Current stock quantity
 * @param filter - Filter type to apply
 * @returns True if product matches filter
 */
export function matchesStockFilter(stockLevel: number = 0, filter: StockFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'out') return isOutOfStock(stockLevel);
  if (filter === 'low') return isLowStock(stockLevel);
  if (filter === 'good') return isInStock(stockLevel);
  return true;
}

/**
 * Get Tailwind CSS class for stock level badge
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Tailwind class names
 */
export function getStockBadgeClass(stockLevel: number = 0): string {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-green-100 text-green-800 border-green-200';
}

/**
 * Get stock level category
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @returns Category identifier
 */
export function getStockCategory(stockLevel: number = 0): 'out' | 'low' | 'good' {
  if (stockLevel === STOCK_THRESHOLDS.OUT_OF_STOCK) return 'out';
  if (stockLevel <= STOCK_THRESHOLDS.LOW_STOCK_MAX) return 'low';
  return 'good';
}

/**
 * Format stock level for display
 * @param stockLevel - Current stock quantity (defaults to 0)
 * @param showLabel - Whether to include status label (default: false)
 * @returns Formatted string
 */
export function formatStockLevel(stockLevel: number = 0, showLabel: boolean = false): string {
  if (showLabel) {
    return getStockDescription(stockLevel);
  }
  return `${stockLevel} ${stockLevel === 1 ? 'unit' : 'units'}`;
}

// Export type definitions
export interface StockColorScheme {
  outOfStock: string;
  lowStock: string;
  inStock: string;
}

export interface StockThresholds {
  OUT_OF_STOCK: number;
  LOW_STOCK_MAX: number;
  IN_STOCK_MIN: number;
}

export interface StockLabels {
  outOfStock: string;
  lowStock: string;
  inStock: string;
}
