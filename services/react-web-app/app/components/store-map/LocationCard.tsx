import { X, Navigation, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import type { MapLocation } from './types';
import type { Product } from '~/types/product';
import { cn } from '~/lib/utils';

export interface LocationCardProps {
  location: MapLocation;
  products: Product[];
  onClose: () => void;
  onProductClick?: (product: Product) => void;
  className?: string;
}

export function LocationCard({
  location,
  products,
  onClose,
  onProductClick,
  className
}: LocationCardProps) {
  const locationString = `Aisle ${location.aisle}, Bay ${location.bay}, Section ${location.section}`;
  const hasProducts = products.length > 0;

  const getStockBadgeVariant = (quantity: number) => {
    if (quantity === 0) return 'destructive';
    if (quantity < 5) return 'destructive';
    if (quantity < 20) return 'secondary';
    return 'default';
  };

  return (
    <Card
      className={cn(
        'fixed z-50 w-full max-w-md max-h-[80vh] flex flex-col',
        // Mobile: slide in from bottom
        'bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-300',
        // Desktop: slide in from right
        'md:bottom-4 md:right-4 md:left-auto md:slide-in-from-right',
        className
      )}
    >
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <span>Location Details</span>
          {hasProducts && (
            <Badge variant="secondary">{products.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>{locationString}</CardDescription>
        <CardAction>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close location details"
          >
            <X />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {hasProducts ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Products at this location:
              </h4>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link to={`/map?aisle=${location.aisle}&bay=${location.bay}&section=${location.section}`}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate Here
                </Link>
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {products.map((product, index) => {
                const stockVariant = getStockBadgeVariant(product.stock.quantity);
                const isLowStock = product.stock.quantity < 5 && product.stock.quantity > 0;

                return (
                  <div
                    key={product._id || `product-${index}`}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                      onProductClick && 'cursor-pointer hover:bg-accent hover:border-accent-foreground/20',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    onClick={() => onProductClick?.(product)}
                    role={onProductClick ? 'button' : undefined}
                    tabIndex={onProductClick ? 0 : undefined}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-medium leading-none truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Article #{product.articleNumber}
                      </p>
                      {isLowStock && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          <span>Low stock</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={stockVariant}
                        className="shrink-0"
                      >
                        {product.stock.quantity} in stock
                      </Badge>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {product.price} {product.currency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No products at this location
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
