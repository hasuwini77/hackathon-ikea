import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Product } from "~/types/product";
import { MapPin, Package, DollarSign, RefreshCw } from "lucide-react";
import { useOfflineQueue } from "~/lib/couchbase";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

/**
 * ProductCard Component
 *
 * Displays a summary card for a product with key information.
 * Features:
 * - Product name, article number, and description
 * - Location information (Aisle, Bay, Section)
 * - Stock level with color-coded badges:
 *   - Red (destructive): < 5 units
 *   - Yellow (secondary): < 20 units
 *   - Default: >= 20 units
 * - Price display
 * - "Pending sync" badge for items with local changes
 * - Clickable card for viewing full details
 * - Accessible with proper semantics and keyboard navigation
 */
export function ProductCard({ product, onClick }: ProductCardProps) {
  const { queuedOperations } = useOfflineQueue();
  const hasPending = queuedOperations.some(op => op.document._id === product._id);

  const getStockVariant = () => {
    if (product.stock.quantity < 5) return "destructive";
    if (product.stock.quantity < 20) return "secondary";
    return "default";
  };

  const getStockLabel = () => {
    if (product.stock.quantity < 5) return "Low Stock";
    if (product.stock.quantity < 20) return "Medium Stock";
    return "In Stock";
  };

  const getMatchLabel = () => {
    if (!product.searchMatch) return null;
    if (product.searchMatch.kind === "exact") return "Exact match";
    if (product.searchMatch.kind === "prefix") return "Starts with";
    if (product.searchMatch.kind === "contains") return "Contains";
    if (product.searchMatch.kind === "fuzzy") {
      const pct = Math.max(0, Math.min(99, Math.round((product.searchMatch.score ?? 0) * 100)));
      return `Fuzzy ${pct}%`;
    }
    return null;
  };

  const matchLabel = getMatchLabel();

  return (
    <Card
      className={`w-full overflow-hidden hover:shadow-lg transition-all cursor-pointer group ${
        onClick ? "hover:border-primary" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={`View details for ${product.name}`}
    >
      {product.imageUrl && (
        <div className="h-40 relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(
                product.name
              )}`;
            }}
          />
          {hasPending && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-orange-500 text-white border-0 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              Syncing...
            </Badge>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {product.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Art. #{product.articleNumber}
            </p>
            {matchLabel && (
              <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wide">
                {matchLabel}
              </Badge>
            )}
          </div>
          <Badge variant={getStockVariant()} className="shrink-0">
            <Package className="h-3 w-3 mr-1" aria-hidden="true" />
            {product.stock.quantity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground">
            Aisle <span className="font-medium text-foreground">{product.location.aisle}</span>,
            Bay <span className="font-medium text-foreground">{product.location.bay}</span>,
            Section <span className="font-medium text-foreground">{product.location.section}</span>
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            <span>{product.price.toFixed(2)}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {getStockLabel()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
