import type { StoreZone } from './types';
import { cn } from '~/lib/utils';

export interface ZoneLegendProps {
  zones: StoreZone[];
  compact?: boolean;
  className?: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
};

export function ZoneLegend({ zones, compact = false, className }: ZoneLegendProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-lg',
        className
      )}
    >
      <h3 className={cn(
        'font-semibold text-sm',
        compact ? 'sr-only' : 'mb-3'
      )}>
        Store Zones
      </h3>

      <div
        className={cn(
          'flex gap-4',
          compact ? 'flex-row flex-wrap' : 'flex-col gap-3'
        )}
      >
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center gap-2"
          >
            <div
              className={cn(
                'rounded',
                colorMap[zone.color] || 'bg-gray-500',
                compact ? 'size-3' : 'size-4'
              )}
              aria-hidden="true"
            />
            <span className={cn(
              'font-medium',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {zone.name}
            </span>
            {!compact && (
              <span className="text-xs text-muted-foreground">
                (Aisles {zone.startAisle}-{zone.endAisle})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
