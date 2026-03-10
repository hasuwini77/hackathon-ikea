import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Product } from "~/types/product";
import {
  MapPin,
  Package,
  DollarSign,
  Plus,
  Minus,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUpdateStock } from "~/lib/couchbase";

interface ProductDetailProps {
  product: Product;
  onClose?: () => void;
}

/**
 * ProductDetail Component
 *
 * Displays comprehensive product information with interactive controls.
 * Features:
 * - Full product details (name, description, article number)
 * - Large, prominent location display for easy warehouse navigation
 * - Interactive stock adjustment (+/- buttons)
 * - Last stock check timestamp
 * - Price and category information
 * - Navigate button that links to store map with product location
 * - Responsive layout optimized for mobile use
 * - Touch-friendly button sizes (44x44px minimum)
 */
export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(product.stock.quantity);
  const { updateStock, updating, error } = useUpdateStock();
  const navigate = useNavigate();

  const handleStockChange = async (delta: number) => {
    const newQuantity = Math.max(0, quantity + delta);
    setQuantity(newQuantity);
    try {
      await updateStock(product._id, newQuantity);
    } catch (err) {
      // Keep optimistic update — error is surfaced via the error banner below
      console.error('Failed to update stock:', err);
    }
  };

  const handleNavigate = () => {
    const { aisle, bay, section } = product.location;
    navigate(`/map?aisle=${aisle}&bay=${bay}&section=${section}`);
    // Close drawer when navigating
    if (onClose) {
      onClose();
    }
  };

  const getStockVariant = () => {
    if (quantity < 5) return "destructive";
    if (quantity < 20) return "secondary";
    return "default";
  };

  const getStockStatus = () => {
    if (quantity === 0) return "Out of Stock";
    if (quantity < 5) return "Critical Low";
    if (quantity < 20) return "Low Stock";
    return "In Stock";
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Product Image */}
      {product.imageUrl && (
        <div className="h-48 md:h-64 relative bg-gray-100 dark:bg-gray-800 shrink-0">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e5e7eb/6b7280?text=${encodeURIComponent(
                product.name
              )}`;
            }}
          />
          {product.hasPendingChanges && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-3 bg-yellow-500 text-white border-0"
            >
              Pending Sync
            </Badge>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
          <p className="text-sm text-muted-foreground">
            Article #{product.articleNumber}
          </p>
          {product.category && (
            <Badge variant="outline" className="mt-2">
              {product.category}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-base text-muted-foreground leading-relaxed">
          {product.description}
        </p>

        {/* Location Card - Prominent */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Warehouse Location
            </CardTitle>
            <div title="IKEA AXIS Coordinate: Structural encoding for offline physical navigation">
              <Badge variant="outline" className="font-mono bg-background border-primary/30">
                AXIS: {product.location.zone ? product.location.zone.substring(0, 2).toUpperCase() : 'WH'}-{product.location.aisle}-{product.location.bay}{product.location.section}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Aisle</p>
                <p className="text-3xl font-bold text-primary">
                  {product.location.aisle}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Bay</p>
                <p className="text-3xl font-bold text-primary">
                  {product.location.bay}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Section</p>
                <p className="text-3xl font-bold text-primary">
                  {product.location.section}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Management Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" aria-hidden="true" />
                Stock Level
              </CardTitle>
              <Badge variant={getStockVariant()}>{getStockStatus()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stock Counter */}
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => handleStockChange(-1)}
                disabled={updating || quantity === 0}
                aria-label="Decrease stock"
              >
                <Minus className="h-5 w-5" />
              </Button>

              <div className="text-center min-w-[80px]">
                <p className="text-4xl font-bold tabular-nums">
                  {quantity}
                </p>
                <p className="text-xs text-muted-foreground mt-1">units</p>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => handleStockChange(1)}
                disabled={updating}
                aria-label="Increase stock"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Last Checked */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>
                Last checked{" "}
                {formatDistanceToNow(new Date(product.stock.lastChecked), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Low Stock Warning */}
            {quantity < 5 && quantity > 0 && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-destructive">Low Stock Alert</p>
                  <p className="text-muted-foreground mt-1">
                    Consider reordering soon to avoid stockout.
                  </p>
                </div>
              </div>
            )}

            {/* Update Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-900/50">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">Update queued for sync</p>
                  <p className="text-muted-foreground mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <div className="flex items-center gap-1 text-2xl font-bold">
                <DollarSign className="h-5 w-5" aria-hidden="true" />
                <span>{product.price.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="shrink-0 p-4 border-t bg-background space-y-2">
        <Button
          variant="default"
          className="w-full h-12 text-base"
          onClick={handleNavigate}
        >
          <MapPin className="h-5 w-5 mr-2" aria-hidden="true" />
          Navigate to Location
        </Button>

        {onClose && (
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
