import { useState, useMemo, useCallback, useEffect } from "react";
import { useProducts, productDocumentsToProducts } from "~/lib/couchbase";
import { stockThresholds } from "~/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Package,
  MapPin,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Grid3x3,
  List as ListIcon,
  Navigation,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Product } from "~/types/product";
import { Link, useSearchParams } from "react-router";

export function meta() {
  return [
    { title: "Product Catalog - IKEA Staff Finder" },
    { name: "description", content: "Browse and search IKEA product catalog" },
  ];
}

// Categories available in the IKEA catalog
const CATEGORIES = [
  "All Categories",
  "Storage",
  "Bedroom",
  "Living Room",
  "Home Office",
  "Dining",
  "Kitchen",
  "Bathroom",
  "Textiles",
  "Lighting",
  "Decoration",
  "Children's",
  "Outdoor",
  "Cookshop",
  "Home Organization",
];

// Stock status options
type StockStatus = "all" | "in-stock" | "low-stock" | "out-of-stock";

// Sort options
type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

// View mode
type ViewMode = "grid" | "list";

// Items per page options
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;
const DEFAULT_ITEMS_PER_PAGE = 24;
const ITEMS_PER_PAGE_STORAGE_KEY = "ikea-products-items-per-page";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [stockStatus, setStockStatus] = useState<StockStatus>("all");
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Pagination - Initialize items per page from localStorage
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ITEMS_PER_PAGE_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (ITEMS_PER_PAGE_OPTIONS.includes(parsed as any)) {
          return parsed;
        }
      }
    }
    return DEFAULT_ITEMS_PER_PAGE;
  });

  // Current page - Initialize from URL params
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 1;
  });

  // Product detail sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Mobile filter sheet
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch all products
  const { products: productDocs, loading, error } = useProducts();
  const products = useMemo(() => productDocumentsToProducts(productDocs), [productDocs]);

  // Sync current page to URL params
  useEffect(() => {
    if (currentPage === 1) {
      // Remove page param if on first page for cleaner URLs
      searchParams.delete("page");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("page", currentPage.toString());
      setSearchParams(searchParams, { replace: true });
    }
  }, [currentPage]);

  // Update URL when page changes from URL navigation
  useEffect(() => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed !== currentPage) {
        setCurrentPage(parsed);
      }
    }
  }, [searchParams.get("page")]);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];

    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.articleNumber.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Stock status filter (using centralized thresholds)
    if (stockStatus === "in-stock") {
      filtered = filtered.filter((p) => p.stock.quantity > stockThresholds.low);
    } else if (stockStatus === "low-stock") {
      filtered = filtered.filter((p) => p.stock.quantity > stockThresholds.outOfStock && p.stock.quantity <= stockThresholds.low);
    } else if (stockStatus === "out-of-stock") {
      filtered = filtered.filter((p) => p.stock.quantity <= stockThresholds.outOfStock);
    }

    // Price range filter
    if (minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= maxPrice);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "stock-asc":
          return a.stock.quantity - b.stock.quantity;
        case "stock-desc":
          return b.stock.quantity - a.stock.quantity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, stockStatus, minPrice, maxPrice, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  // Calculate display range
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length);

  // Reset to page 1 when filters change
  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Handle filter changes with page reset
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetPage();
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    resetPage();
  };

  const handleStockStatusChange = (value: StockStatus) => {
    setStockStatus(value);
    resetPage();
  };

  const handlePriceChange = (min?: number, max?: number) => {
    setMinPrice(min);
    setMaxPrice(max);
    resetPage();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setStockStatus("all");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    resetPage();
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(ITEMS_PER_PAGE_STORAGE_KEY, newItemsPerPage.toString());
    }
    // Reset to page 1
    setCurrentPage(1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          if (currentPage > 1) {
            setCurrentPage((p) => p - 1);
            e.preventDefault();
          }
          break;
        case "ArrowRight":
          if (currentPage < totalPages) {
            setCurrentPage((p) => p + 1);
            e.preventDefault();
          }
          break;
        case "Home":
          if (currentPage !== 1) {
            setCurrentPage(1);
            e.preventDefault();
          }
          break;
        case "End":
          if (currentPage !== totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  // Jump to page handler
  const handleJumpToPage = (pageInput: string) => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Get stock indicator color (using centralized thresholds)
  const getStockColor = (quantity: number) => {
    if (quantity <= stockThresholds.outOfStock) return "bg-red-500";
    if (quantity <= stockThresholds.low) return "bg-orange-500";
    if (quantity <= stockThresholds.medium) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStockLabel = (quantity: number) => {
    if (quantity <= stockThresholds.outOfStock) return "Out of Stock";
    if (quantity <= stockThresholds.low) return "Low Stock";
    if (quantity <= stockThresholds.medium) return "Medium Stock";
    return "In Stock";
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory !== "All Categories") count++;
    if (stockStatus !== "all") count++;
    if (minPrice !== undefined || maxPrice !== undefined) count++;
    return count;
  }, [searchQuery, selectedCategory, stockStatus, minPrice, maxPrice]);

  // Filter sidebar content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-300">
          Category
        </h3>
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                className="w-full justify-start"
                size="sm"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Stock Status Filter */}
      <div>
        <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-300">
          Stock Status
        </h3>
        <div className="space-y-1">
          <Button
            variant={stockStatus === "all" ? "default" : "ghost"}
            className="w-full justify-start"
            size="sm"
            onClick={() => handleStockStatusChange("all")}
          >
            All Products
          </Button>
          <Button
            variant={stockStatus === "in-stock" ? "default" : "ghost"}
            className="w-full justify-start"
            size="sm"
            onClick={() => handleStockStatusChange("in-stock")}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            In Stock (20+)
          </Button>
          <Button
            variant={stockStatus === "low-stock" ? "default" : "ghost"}
            className="w-full justify-start"
            size="sm"
            onClick={() => handleStockStatusChange("low-stock")}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
            Low Stock (1-19)
          </Button>
          <Button
            variant={stockStatus === "out-of-stock" ? "default" : "ghost"}
            className="w-full justify-start"
            size="sm"
            onClick={() => handleStockStatusChange("out-of-stock")}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Out of Stock
          </Button>
        </div>
      </div>

      <Separator />

      {/* Price Range Filter */}
      <div>
        <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-300">
          Price Range (SEK)
        </h3>
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="Min price"
            value={minPrice ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              handlePriceChange(val, maxPrice);
            }}
          />
          <Input
            type="number"
            placeholder="Max price"
            value={maxPrice ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              handlePriceChange(minPrice, val);
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Product Catalog
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse and search our complete inventory
          </p>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, article number, or description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 h-12 text-base"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile Filter Button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your product search
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[200px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                <SelectItem value="stock-asc">Stock (Low to High)</SelectItem>
                <SelectItem value="stock-desc">Stock (High to Low)</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Items Per Page Selector */}
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Results Count */}
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {filteredAndSortedProducts.length} product{filteredAndSortedProducts.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Product Grid/List */}
          <div className="flex-1 min-w-0">
            {filteredAndSortedProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                    No products found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Try adjusting your filters or search query
                  </p>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedProducts.map((product, index) => (
                      <Card
                        key={product._id || `product-${index}`}
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => openProductDetail(product)}
                      >
                        {/* Product Image Placeholder */}
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 h-48 flex items-center justify-center">
                          <Package className="h-16 w-16 text-gray-400" />
                        </div>

                        <CardContent className="p-4">
                          {/* Product Name */}
                          <h3 className="font-bold text-lg mb-1 truncate">
                            {product.name}
                          </h3>

                          {/* Description */}
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">
                            {product.description}
                          </p>

                          {/* Price */}
                          <div className="text-xl font-bold text-[#0058A3] dark:text-blue-400 mb-3">
                            {product.price.toLocaleString()} {product.currency}
                          </div>

                          {/* Stock Status */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${getStockColor(product.stock.quantity)}`} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {getStockLabel(product.stock.quantity)}
                            </span>
                            <span className="text-sm font-semibold ml-auto">
                              {product.stock.quantity} units
                            </span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <MapPin className="h-4 w-4" />
                            <span>
                              Zone {product.location.aisle}, Aisle {product.location.bay}, Section {product.location.section}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProductDetail(product);
                              }}
                            >
                              <Navigation className="h-4 w-4 mr-1" />
                              View on Map
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Add to shopping list functionality
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add to List
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedProducts.map((product, index) => (
                      <Card
                        key={product._id || `product-list-${index}`}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => openProductDetail(product)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Product Image Placeholder */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 w-24 h-24 shrink-0 rounded flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg truncate">
                                    {product.name}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Art. #{product.articleNumber}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-[#0058A3] dark:text-blue-400">
                                    {product.price.toLocaleString()} {product.currency}
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                                {product.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-4">
                                {/* Stock */}
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getStockColor(product.stock.quantity)}`} />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {product.stock.quantity} units
                                  </span>
                                </div>

                                {/* Location */}
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {product.location.aisle}-{product.location.bay}-{product.location.section}
                                  </span>
                                </div>

                                {/* Category */}
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>

                                {/* Actions */}
                                <div className="ml-auto flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openProductDetail(product);
                                    }}
                                  >
                                    <Navigation className="h-4 w-4 mr-1" />
                                    Map
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Add to shopping list functionality
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 space-y-4">
                    {/* Showing X-Y of Z */}
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Showing {startIndex}-{endIndex} of {filteredAndSortedProducts.length} products
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      {/* First and Previous buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          title="First page (Home key)"
                          aria-label="Go to first page"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          title="Previous page (Left arrow)"
                          aria-label="Go to previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                      </div>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                              aria-label={`Go to page ${pageNum}`}
                              aria-current={currentPage === pageNum ? "page" : undefined}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Next and Last buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          title="Next page (Right arrow)"
                          aria-label="Go to next page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          title="Last page (End key)"
                          aria-label="Go to last page"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Jump to page (for large catalogs) */}
                    {totalPages > 10 && (
                      <div className="flex items-center justify-center gap-2">
                        <label htmlFor="jump-to-page" className="text-sm text-gray-600 dark:text-gray-400">
                          Jump to page:
                        </label>
                        <Input
                          id="jump-to-page"
                          type="number"
                          min="1"
                          max={totalPages}
                          placeholder={currentPage.toString()}
                          className="w-20 h-8 text-center"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleJumpToPage(e.currentTarget.value);
                              e.currentTarget.value = "";
                            }
                          }}
                          aria-label="Jump to page number"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          of {totalPages}
                        </span>
                      </div>
                    )}

                    {/* Keyboard shortcuts hint */}
                    <div className="text-center text-xs text-gray-500 dark:text-gray-500">
                      Use arrow keys to navigate • Home/End for first/last page
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">{selectedProduct.name}</SheetTitle>
                <SheetDescription>
                  Article Number: {selectedProduct.articleNumber}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Product Image Placeholder */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 h-64 rounded-lg flex items-center justify-center">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>

                {/* Price and Stock */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-[#0058A3] dark:text-blue-400">
                      {selectedProduct.price.toLocaleString()} {selectedProduct.currency}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <div className={`w-3 h-3 rounded-full ${getStockColor(selectedProduct.stock.quantity)}`} />
                      <span className="font-semibold">
                        {getStockLabel(selectedProduct.stock.quantity)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedProduct.stock.quantity} units available
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedProduct.description}
                  </p>
                </div>

                <Separator />

                {/* Dimensions */}
                <div>
                  <h3 className="font-semibold mb-3">Dimensions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Width</div>
                      <div className="font-semibold">
                        {selectedProduct.dimensions.width} {selectedProduct.dimensions.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Height</div>
                      <div className="font-semibold">
                        {selectedProduct.dimensions.height} {selectedProduct.dimensions.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Depth</div>
                      <div className="font-semibold">
                        {selectedProduct.dimensions.depth} {selectedProduct.dimensions.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Weight</div>
                      <div className="font-semibold">
                        {selectedProduct.weight} kg
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Location */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Warehouse Location
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Zone</div>
                        <div className="text-lg font-bold">{selectedProduct.location.aisle}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Aisle</div>
                        <div className="text-lg font-bold">{selectedProduct.location.bay}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Section</div>
                        <div className="text-lg font-bold">{selectedProduct.location.section}</div>
                      </div>
                    </div>

                    {/* Mini Map Placeholder */}
                    <div className="bg-white dark:bg-gray-900 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 h-32 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <div className="text-sm">Map Preview</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Category</div>
                    <Badge variant="outline" className="mt-1">
                      {selectedProduct.category}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                    <div className="font-semibold mt-1">{selectedProduct.productType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Assembly Required</div>
                    <div className="font-semibold mt-1">
                      {selectedProduct.assemblyRequired ? "Yes" : "No"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
                    <div className="font-semibold mt-1">
                      {new Date(selectedProduct.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button asChild className="flex-1" size="lg">
                    <Link to="/map">
                      <Navigation className="h-5 w-5 mr-2" />
                      Navigate to Product
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1" size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Add to Shopping List
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
