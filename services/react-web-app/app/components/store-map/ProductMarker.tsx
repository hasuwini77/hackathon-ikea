interface ProductMarkerProps {
  section?: string; // 'A', 'B', 'C', 'D'
  stockLevel?: number;
  productName?: string;
}

// Stock level color scheme matching RealisticStoreMap
const getStockColor = (stockLevel: number = 0): string => {
  if (stockLevel === 0) return '#ef4444'; // red-500 - out of stock
  if (stockLevel <= 10) return '#f59e0b'; // amber-500 - low stock
  return '#22c55e'; // green-500 - good stock
};

const getStockLabel = (stockLevel: number = 0): string => {
  if (stockLevel === 0) return 'Out of Stock';
  if (stockLevel <= 10) return `Low: ${stockLevel}`;
  return `${stockLevel}`;
};

export function ProductMarker({ section, stockLevel, productName }: ProductMarkerProps) {
  const color = getStockColor(stockLevel);
  const isOutOfStock = stockLevel === 0;
  const displayText = section || getStockLabel(stockLevel);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" title={productName || `Stock: ${stockLevel || 0}`}>
        {/* Pulsing outer ring - only for out of stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 animate-ping">
            <div className="w-8 h-8 rounded-full opacity-75" style={{ backgroundColor: color }} />
          </div>
        )}

        {/* Solid center badge with section letter or stock count */}
        <div
          className="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span className="text-white text-xs font-bold">{displayText}</span>
        </div>
      </div>
    </div>
  );
}
