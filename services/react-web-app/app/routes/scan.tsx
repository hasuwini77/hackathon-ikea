import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { OfflineErrorBoundary } from "~/components/OfflineErrorBoundary";
import { BarcodeScanner } from "~/components/BarcodeScanner";
import { ProductSearch } from "~/components/ProductSearch";
import { ProductCard } from "~/components/ProductCard";
import { ProductDetail } from "~/components/ProductDetail";
import { useProducts, productDocumentsToProducts } from "~/lib/couchbase";
import type { Product } from "~/types/product";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "~/components/ui/pagination";
import { Package, Map } from "lucide-react";

const PRODUCTS_PER_PAGE = 12;

export function meta() {
  return [
    { title: "Product Scanner - IKEA Staff Finder" },
    { name: "description", content: "Scan and search for IKEA products" },
  ];
}

/**
 * Scan Route
 *
 * Main page for the IKEA staff product finder application.
 * Integrates all components to provide a complete product scanning
 * and search experience with offline support.
 *
 * Layout:
 * - SyncStatus: Fixed header showing connectivity
 * - BarcodeScanner: Quick article number input
 * - ProductSearch: Search bar with debouncing
 * - Product Grid: Responsive grid of product cards
 * - ProductDetail: Drawer/modal for detailed product view
 *
 * Features:
 * - Real-time search with debouncing
 * - Barcode scanning (manual entry + live camera + photo fallback)
 * - Offline-first architecture
 * - Mobile-responsive design
 * - Accessible keyboard navigation
 */
export default function ScanPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Use Couchbase hook with query parameter
  const { products: productDocs, loading } = useProducts({ query: searchTerm || undefined });

  // Transform Couchbase documents to UI format
  const allProducts = productDocumentsToProducts(productDocs);

  // Pagination calculations
  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const products = allProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('ellipsis');

      pages.push(totalPages);
    }

    return pages;
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleScan = (articleNumber: string) => {
    // When scanning, set the search term to the article number
    setSearchTerm(articleNumber);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Small delay before clearing to allow drawer animation
    setTimeout(() => setSelectedProduct(null), 300);
  };

  return (
    <ErrorBoundary>
      <OfflineErrorBoundary>
        <div className="min-h-screen bg-background flex flex-col">
          {/* Main Content - Scrollable */}
          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
              {/* Page Header */}
              <header className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Product Finder</h1>
                    <p className="text-muted-foreground">
                      Scan or search for products to check stock and location
                    </p>
                  </div>
                  <Link to="/map">
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      <Map className="h-4 w-4 mr-2" />
                      View Map
                    </Button>
                    <Button variant="outline" size="icon" className="sm:hidden">
                      <Map className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </header>

              {/* Scanner Section */}
              <ErrorBoundary>
                <BarcodeScanner onScan={handleScan} />
              </ErrorBoundary>

              {/* Search Section */}
              <ErrorBoundary>
                <ProductSearch
                  onSearch={handleSearch}
                  resultCount={searchTerm ? allProducts.length : undefined}
                />
              </ErrorBoundary>

              {/* Results Section */}
              <ErrorBoundary>
                <section aria-label="Product results">
                  {loading ? (
                    // Loading Skeletons
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="h-40 w-full rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : products.length > 0 ? (
                    // Product Grid with Pagination
                    <div className="space-y-6">
                      {/* Results info */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          Showing {startIndex + 1}-{Math.min(endIndex, allProducts.length)} of {allProducts.length} products
                        </span>
                        {totalPages > 1 && (
                          <span>Page {currentPage} of {totalPages}</span>
                        )}
                      </div>

                      {/* Product Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {products.map((product, index) => (
                          <ProductCard
                            key={product._id || `product-${index}`}
                            product={product}
                            onClick={() => handleProductClick(product)}
                          />
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>

                            {getPageNumbers().map((page, idx) =>
                              page === 'ellipsis' ? (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              ) : (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            )}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </div>
                  ) : searchTerm ? (
                    // No Results
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No products found</h3>
                      <p className="text-muted-foreground">
                        Try a different search term or article number
                      </p>
                    </div>
                  ) : (
                    // Initial State
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Start searching</h3>
                      <p className="text-muted-foreground">
                        Scan a barcode or search for products to get started
                      </p>
                    </div>
                  )}
                </section>
              </ErrorBoundary>
            </div>
          </main>

          {/* Product Detail Drawer */}
          <ErrorBoundary>
            {selectedProduct && (
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent>
                  <DrawerHeader className="sr-only">
                    <DrawerTitle>{selectedProduct.name}</DrawerTitle>
                  </DrawerHeader>
                  <ProductDetail
                    product={selectedProduct}
                    onClose={handleCloseDrawer}
                  />
                </DrawerContent>
              </Drawer>
            )}
          </ErrorBoundary>
        </div>
      </OfflineErrorBoundary>
    </ErrorBoundary>
  );
}
