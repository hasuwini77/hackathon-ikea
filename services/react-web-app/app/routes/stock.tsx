import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useProducts, useUpdateStock, useOfflineQueue, productDocumentsToProducts } from "~/lib/couchbase";
import { stockThresholds } from "~/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import type { Product } from "~/types/product";
import {
  Package,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  AlertTriangle,
  Search,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Map as MapIcon,
  BarChart3
} from "lucide-react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Stock Management - IKEA Staff Finder" },
    { name: "description", content: "Manage IKEA product inventory and stock levels" },
  ];
}

type FilterType = "all" | "outOfStock" | "low" | "medium" | "inStock" | "pending";
type ViewMode = "grid" | "table";
type SortOption = "stock-asc" | "stock-desc" | "name-asc" | "name-desc";

export default function StockPage() {
  const { products: productDocs, loading, error } = useProducts();
  const { updateStock, updating } = useUpdateStock();
  const { queuedOperations } = useOfflineQueue();
  const [filter, setFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("stock-asc");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

  // Returns the optimistically-updated quantity for display
  const getQuantity = (product: Product) =>
    localQuantities[product._id] ?? product.stock.quantity;
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const productRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Transform ProductDocuments to Products for UI
  const products = useMemo(() => {
    return productDocumentsToProducts(productDocs);
  }, [productDocs]);

  // Get unique categories and zones from products
  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return uniqueCategories.sort();
  }, [products]);

  const zones = useMemo(() => {
    if (!products) return [];
    const uniqueZones = Array.from(new Set(products.map(p => p.location.aisle)));
    return uniqueZones.sort();
  }, [products]);

  // Filter and sort products based on selected filters
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // Apply stock filter using centralized thresholds
    if (filter === "outOfStock") {
      filtered = filtered.filter(p => p.stock.quantity <= stockThresholds.outOfStock);
    } else if (filter === "low") {
      filtered = filtered.filter(p => p.stock.quantity > stockThresholds.outOfStock && p.stock.quantity <= stockThresholds.low);
    } else if (filter === "medium") {
      filtered = filtered.filter(p => p.stock.quantity > stockThresholds.low && p.stock.quantity <= stockThresholds.medium);
    } else if (filter === "inStock") {
      filtered = filtered.filter(p => p.stock.quantity > stockThresholds.medium);
    } else if (filter === "pending") {
      filtered = filtered.filter(p =>
        queuedOperations.some(op => op.document._id === p._id)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Apply zone filter
    if (zoneFilter !== "all") {
      filtered = filtered.filter(p => p.location.aisle === zoneFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.articleNumber.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Sort products
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "stock-asc":
          if (a.stock.quantity !== b.stock.quantity) {
            return a.stock.quantity - b.stock.quantity;
          }
          return a.name.localeCompare(b.name);
        case "stock-desc":
          if (a.stock.quantity !== b.stock.quantity) {
            return b.stock.quantity - a.stock.quantity;
          }
          return a.name.localeCompare(b.name);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [products, filter, categoryFilter, zoneFilter, searchQuery, sortBy, queuedOperations]);

  // Get stock level variant for badge (using centralized thresholds)
  const getStockVariant = (quantity: number): "destructive" | "secondary" | "default" | "outline" => {
    if (quantity <= stockThresholds.outOfStock) return "destructive";
    if (quantity <= stockThresholds.low) return "destructive";
    if (quantity <= stockThresholds.medium) return "secondary";
    return "default";
  };

  // Get stock level label (using centralized thresholds)
  const getStockLabel = (quantity: number) => {
    if (quantity <= stockThresholds.outOfStock) return "Out of Stock";
    if (quantity <= stockThresholds.low) return "Low Stock";
    if (quantity <= stockThresholds.medium) return "Medium Stock";
    return "In Stock";
  };

  // Get stock level color for indicators (using centralized thresholds)
  const getStockColor = (quantity: number) => {
    if (quantity <= stockThresholds.outOfStock) return "bg-red-500";
    if (quantity <= stockThresholds.low) return "bg-orange-500";
    if (quantity <= stockThresholds.medium) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Check if product has pending sync
  const hasPendingSync = (productId: string) => {
    return queuedOperations.some(op => op.document._id === productId);
  };

  // Handle stock adjustment with toast feedback
  const handleStockAdjustment = async (product: Product, delta: number) => {
    const currentQty = localQuantities[product._id] ?? product.stock.quantity;
    const newQuantity = Math.max(0, currentQty + delta);
    setLocalQuantities(prev => ({ ...prev, [product._id]: newQuantity }));
    setUpdatingIds(prev => new Set(prev).add(product._id));

    try {
      await updateStock(product._id, newQuantity);
      toast.success(`Updated ${product.name} stock to ${newQuantity}`);
    } catch (err) {
      console.error("Failed to update stock:", err);
      toast.error(`Failed to update ${product.name} stock`, {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement) return;

      const maxIndex = filteredProducts.length - 1;

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
          break;
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            const product = filteredProducts[selectedIndex];
            if (!updatingIds.has(product._id) && getQuantity(product) > 0) {
              handleStockAdjustment(product, -1);
            }
          }
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            const product = filteredProducts[selectedIndex];
            if (!updatingIds.has(product._id)) {
              handleStockAdjustment(product, 1);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            const product = filteredProducts[selectedIndex];
            if (!updatingIds.has(product._id)) {
              handleStockAdjustment(product, 1);
            }
          }
          break;
        case '-':
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            const product = filteredProducts[selectedIndex];
            if (!updatingIds.has(product._id) && getQuantity(product) > 0) {
              handleStockAdjustment(product, -10);
            }
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            const product = filteredProducts[selectedIndex];
            if (!updatingIds.has(product._id)) {
              handleStockAdjustment(product, 10);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProducts, selectedIndex, updatingIds]);

  // Scroll selected item into view
  useEffect(() => {
    const ref = productRefs.current.get(selectedIndex);
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter, categoryFilter, zoneFilter, searchQuery]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!products) return {
      total: 0,
      outOfStock: 0,
      lowStock: 0,
      mediumStock: 0,
      inStock: 0,
      pending: 0,
      totalValue: 0,
    };

    return {
      total: products.length,
      outOfStock: products.filter(p => p.stock.quantity === 0).length,
      lowStock: products.filter(p => p.stock.quantity > 0 && p.stock.quantity <= 10).length,
      mediumStock: products.filter(p => p.stock.quantity > 10 && p.stock.quantity <= 50).length,
      inStock: products.filter(p => p.stock.quantity > 50).length,
      pending: queuedOperations.length,
      totalValue: products.reduce((sum, p) => sum + (p.stock.quantity * p.price), 0),
    };
  }, [products, queuedOperations]);

  const hasNoProducts = !loading && !error && products.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Error loading products: {error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Stock Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and adjust inventory levels across all products
          </p>
        </header>

        {/* Summary Dashboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} total value
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.outOfStock + stats.lowStock}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.outOfStock} out of stock, {stats.lowStock} low
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Medium Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.mediumStock}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                11-50 units available
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Well Stocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.inStock}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                50+ units available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Controls */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products by name, article number, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 w-8 p-0"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stock Level Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All Products
                <Badge variant="outline" className="ml-2">{stats.total}</Badge>
              </Button>
              <Button
                variant={filter === "outOfStock" ? "default" : "outline"}
                onClick={() => setFilter("outOfStock")}
                size="sm"
              >
                <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                Out of Stock
                {stats.outOfStock > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.outOfStock}</Badge>
                )}
              </Button>
              <Button
                variant={filter === "low" ? "default" : "outline"}
                onClick={() => setFilter("low")}
                size="sm"
              >
                <div className="h-2 w-2 rounded-full bg-orange-500 mr-2" />
                Low Stock
                {stats.lowStock > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.lowStock}</Badge>
                )}
              </Button>
              <Button
                variant={filter === "medium" ? "default" : "outline"}
                onClick={() => setFilter("medium")}
                size="sm"
              >
                <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                Medium Stock
                {stats.mediumStock > 0 && (
                  <Badge variant="secondary" className="ml-2">{stats.mediumStock}</Badge>
                )}
              </Button>
              <Button
                variant={filter === "inStock" ? "default" : "outline"}
                onClick={() => setFilter("inStock")}
                size="sm"
              >
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                In Stock
                {stats.inStock > 0 && (
                  <Badge variant="default" className="ml-2">{stats.inStock}</Badge>
                )}
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Pending Sync
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-2">{stats.pending}</Badge>
                )}
              </Button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Category:</span>
                <Button
                  variant={categoryFilter === "all" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? "default" : "ghost"}
                    onClick={() => setCategoryFilter(category)}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

            {/* Zone Filter */}
            {zones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Zone:</span>
                <Button
                  variant={zoneFilter === "all" ? "default" : "ghost"}
                  onClick={() => setZoneFilter("all")}
                  size="sm"
                >
                  All Zones
                </Button>
                {zones.map(zone => (
                  <Button
                    key={zone}
                    variant={zoneFilter === zone ? "default" : "ghost"}
                    onClick={() => setZoneFilter(zone)}
                    size="sm"
                  >
                    Zone {zone}
                  </Button>
                ))}
              </div>
            )}

            {/* Sort Options */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === "stock-asc" ? "default" : "ghost"}
                onClick={() => setSortBy("stock-asc")}
                size="sm"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Stock: Low to High
              </Button>
              <Button
                variant={sortBy === "stock-desc" ? "default" : "ghost"}
                onClick={() => setSortBy("stock-desc")}
                size="sm"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Stock: High to Low
              </Button>
              <Button
                variant={sortBy === "name-asc" ? "default" : "ghost"}
                onClick={() => setSortBy("name-asc")}
                size="sm"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Name: A to Z
              </Button>
              <Button
                variant={sortBy === "name-desc" ? "default" : "ghost"}
                onClick={() => setSortBy("name-desc")}
                size="sm"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Name: Z to A
              </Button>
            </div>

            {/* Results Count */}
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product List */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              {hasNoProducts ? (
                <>
                  <p className="font-medium text-foreground">No products in the local database yet.</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Seed data from this folder: <code>docker compose --profile tools run --rm seed</code>
                  </p>
                </>
              ) : (
                <p>No products found matching the current filters</p>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4">
            {filteredProducts.map((product, index) => {
              const isPending = hasPendingSync(product._id);
              const isUpdating = updatingIds.has(product._id);
              const isSelected = index === selectedIndex;

              return (
                <Card
                  key={product._id || `product-${index}`}
                  ref={(el) => { if (el) productRefs.current.set(index, el); }}
                  className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Stock Level Indicator */}
                      <div className={`w-1 md:w-2 h-full md:h-24 absolute left-0 ${getStockColor(product.stock.quantity)}`} />

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Art. #{product.articleNumber}
                            </p>
                          </div>
                          {isPending && (
                            <Badge
                              variant="secondary"
                              className="bg-orange-500 text-white border-0 shrink-0"
                            >
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm mb-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>
                              {product.location.aisle}-{product.location.bay}-{product.location.section}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          <span className="text-muted-foreground">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                          <Link
                            to={`/map?aisle=${product.location.aisle}&bay=${product.location.bay}&section=${product.location.section}`}
                          >
                            <Button variant="outline" size="sm">
                              <MapIcon className="h-3 w-3 mr-1" />
                              View on Map
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Stock Controls */}
                      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant={getStockVariant(getQuantity(product))}
                            className="min-w-[100px] justify-center"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {getQuantity(product)} units
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getStockLabel(getQuantity(product))}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 border rounded-md p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStockAdjustment(product, -1)}
                            disabled={isUpdating || getQuantity(product) === 0}
                            className="h-8 w-8"
                            title="Decrease by 1"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="w-12 text-center font-semibold">
                            {isUpdating ? (
                              <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              getQuantity(product)
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStockAdjustment(product, 1)}
                            disabled={isUpdating}
                            className="h-8 w-8"
                            title="Increase by 1"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockAdjustment(product, -10)}
                            disabled={isUpdating || getQuantity(product) === 0}
                            title="Decrease by 10"
                          >
                            -10
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockAdjustment(product, 10)}
                            disabled={isUpdating}
                            title="Increase by 10"
                          >
                            +10
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Article #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => {
                    const isPending = hasPendingSync(product._id);
                    const isUpdating = updatingIds.has(product._id);

                    return (
                      <TableRow key={product._id || `product-row-${index}`}>
                        <TableCell>
                          <div className={`w-3 h-3 rounded-full ${getStockColor(product.stock.quantity)}`} title={getStockLabel(product.stock.quantity)} />
                        </TableCell>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate">{product.name}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.articleNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.location.aisle}-{product.location.bay}-{product.location.section}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStockVariant(getQuantity(product))}>
                              {getQuantity(product)}
                            </Badge>
                            {isPending && (
                              <RefreshCw className="h-3 w-3 animate-spin text-orange-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/map?aisle=${product.location.aisle}&bay=${product.location.bay}&section=${product.location.section}`}
                            >
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MapIcon className="h-3 w-3" />
                              </Button>
                            </Link>
                            <div className="flex items-center gap-0.5 border rounded-md">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStockAdjustment(product, -1)}
                                disabled={isUpdating || product.stock.quantity === 0}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStockAdjustment(product, 1)}
                                disabled={isUpdating}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
