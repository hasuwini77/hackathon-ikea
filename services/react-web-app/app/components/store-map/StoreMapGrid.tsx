import { AisleColumn } from './AisleColumn';

interface StoreMapGridProps {
  highlightedLocation?: { aisle: number; bay: number; section: string } | null;
  zoom?: number;
  onLocationClick?: (aisle: number, bay: number) => void;
}

// Zone configuration with color coding
const ZONE_CONFIG = {
  showroom: { start: 1, end: 10, color: '#E3F2FD', name: 'Showroom' }, // Light blue
  market: { start: 11, end: 20, color: '#E8F5E9', name: 'Market Hall' }, // Light green
  warehouse: { start: 21, end: 30, color: '#FFF3E0', name: 'Warehouse' }, // Light orange
};

const TOTAL_AISLES = 30;
const BAYS_PER_AISLE = 10;

function getZoneColor(aisle: number): string {
  if (aisle >= ZONE_CONFIG.showroom.start && aisle <= ZONE_CONFIG.showroom.end) {
    return ZONE_CONFIG.showroom.color;
  }
  if (aisle >= ZONE_CONFIG.market.start && aisle <= ZONE_CONFIG.market.end) {
    return ZONE_CONFIG.market.color;
  }
  if (aisle >= ZONE_CONFIG.warehouse.start && aisle <= ZONE_CONFIG.warehouse.end) {
    return ZONE_CONFIG.warehouse.color;
  }
  return '#FFFFFF';
}

export function StoreMapGrid({
  highlightedLocation,
  zoom = 1,
  onLocationClick,
}: StoreMapGridProps) {
  return (
    <div className="w-full h-full overflow-auto bg-gray-100 p-4">
      {/* Zone legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-gray-300"
            style={{ backgroundColor: ZONE_CONFIG.showroom.color }}
          />
          <span className="text-sm font-medium">{ZONE_CONFIG.showroom.name}</span>
          <span className="text-xs text-gray-500">(Aisles 1-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-gray-300"
            style={{ backgroundColor: ZONE_CONFIG.market.color }}
          />
          <span className="text-sm font-medium">{ZONE_CONFIG.market.name}</span>
          <span className="text-xs text-gray-500">(Aisles 11-20)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-gray-300"
            style={{ backgroundColor: ZONE_CONFIG.warehouse.color }}
          />
          <span className="text-sm font-medium">{ZONE_CONFIG.warehouse.name}</span>
          <span className="text-xs text-gray-500">(Aisles 21-30)</span>
        </div>
      </div>

      {/* Grid container with zoom */}
      <div
        className="inline-block transition-transform duration-200"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        <div
          className="grid gap-2 auto-cols-min"
          style={{
            gridTemplateColumns: `repeat(${TOTAL_AISLES}, minmax(auto, 1fr))`,
          }}
        >
          {Array.from({ length: TOTAL_AISLES }, (_, index) => {
            const aisleNumber = index + 1;
            const zoneColor = getZoneColor(aisleNumber);
            const isHighlightedAisle = highlightedLocation?.aisle === aisleNumber;

            return (
              <AisleColumn
                key={aisleNumber}
                aisle={aisleNumber}
                bays={BAYS_PER_AISLE}
                highlightedBay={isHighlightedAisle ? highlightedLocation.bay : undefined}
                highlightedSection={isHighlightedAisle ? highlightedLocation.section : undefined}
                zoneColor={zoneColor}
                onBayClick={
                  onLocationClick ? (bay) => onLocationClick(aisleNumber, bay) : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
