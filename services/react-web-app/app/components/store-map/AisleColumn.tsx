import { BayCell } from './BayCell';

interface AisleColumnProps {
  aisle: number;
  bays: number; // 10
  highlightedBay?: number;
  highlightedSection?: string;
  zoneColor: string;
  onBayClick?: (bay: number) => void;
}

export function AisleColumn({
  aisle,
  bays,
  highlightedBay,
  highlightedSection,
  zoneColor,
  onBayClick,
}: AisleColumnProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Aisle header */}
      <div className="sticky top-0 z-10 bg-gray-800 text-white text-center py-2 px-1 rounded-t font-bold text-sm min-h-[44px] flex items-center justify-center">
        {aisle}
      </div>

      {/* Bay cells */}
      <div className="flex flex-col gap-1">
        {Array.from({ length: bays }, (_, index) => {
          const bayNumber = index + 1;
          const isHighlighted = highlightedBay === bayNumber;

          return (
            <BayCell
              key={bayNumber}
              aisle={aisle}
              bay={bayNumber}
              isHighlighted={isHighlighted}
              highlightedSection={isHighlighted ? highlightedSection : undefined}
              zoneColor={zoneColor}
              onClick={onBayClick ? () => onBayClick(bayNumber) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
