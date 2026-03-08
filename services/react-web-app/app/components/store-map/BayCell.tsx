import { ProductMarker } from './ProductMarker';

interface BayCellProps {
  aisle: number;
  bay: number;
  isHighlighted: boolean;
  highlightedSection?: string; // 'A', 'B', 'C', 'D'
  zoneColor: string;
  onClick?: () => void;
}

export function BayCell({
  aisle,
  bay,
  isHighlighted,
  highlightedSection,
  zoneColor,
  onClick,
}: BayCellProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative min-h-[44px] min-w-[44px] p-2 border border-gray-300 rounded
        transition-all duration-200
        ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''}
        ${onClick ? 'hover:shadow-md hover:scale-102 active:scale-95' : 'cursor-default'}
      `}
      style={{ backgroundColor: zoneColor }}
      aria-label={`Aisle ${aisle}, Bay ${bay}${highlightedSection ? `, Section ${highlightedSection}` : ''}`}
    >
      {/* Bay number */}
      <div className="text-xs font-medium text-gray-700">
        {bay}
      </div>

      {/* Product marker when highlighted */}
      {isHighlighted && highlightedSection && (
        <ProductMarker section={highlightedSection} />
      )}
    </button>
  );
}
