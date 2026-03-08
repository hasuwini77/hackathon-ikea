import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

export interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function MapControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  minZoom = 0.5,
  maxZoom = 2.0,
  className
}: MapControlsProps) {
  const isAtMinZoom = zoom <= minZoom;
  const isAtMaxZoom = zoom >= maxZoom;
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-lg',
        className
      )}
    >
      <Button
        size="icon"
        variant="outline"
        onClick={onZoomIn}
        disabled={isAtMaxZoom}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn />
      </Button>

      <div className="flex items-center justify-center px-2 py-1 text-xs font-medium text-muted-foreground">
        {zoomPercentage}%
      </div>

      <Button
        size="icon"
        variant="outline"
        onClick={onZoomOut}
        disabled={isAtMinZoom}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut />
      </Button>

      <div className="h-px bg-border" />

      <Button
        size="icon"
        variant="outline"
        onClick={onResetZoom}
        aria-label="Reset zoom"
        title="Reset zoom"
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
