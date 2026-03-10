import { useState, useEffect, useCallback } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Search, X } from "lucide-react";

interface ProductSearchProps {
  onSearch: (searchTerm: string) => void;
  resultCount?: number;
  placeholder?: string;
  debounceMs?: number;
  value?: string;
}

/**
 * ProductSearch Component
 *
 * Provides a search input for finding products by name or article number.
 * Features:
 * - Debounced input to reduce excessive searches (default 300ms)
 * - Clear button when text is entered
 * - Shows result count when available
 * - Accessible with proper labels and keyboard navigation
 */
export function ProductSearch({
  onSearch,
  resultCount,
  placeholder = "Search by name or article number...",
  debounceMs = 300,
  value,
}: ProductSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, debounceMs]);

  // Trigger search when debounced value changes
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  // Support controlled value updates (e.g., barcode scan populating search input)
  useEffect(() => {
    if (value === undefined) return;
    if (value !== searchValue) {
      setSearchValue(value);
      setDebouncedValue(value);
    }
  }, [value, searchValue]);

  const handleClear = useCallback(() => {
    setSearchValue("");
    setDebouncedValue("");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-label="Search products"
          aria-describedby={resultCount !== undefined ? "search-results-count" : undefined}
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {resultCount !== undefined && searchValue && (
        <p
          id="search-results-count"
          className="text-xs text-muted-foreground px-1"
          role="status"
          aria-live="polite"
        >
          {resultCount === 0
            ? "No products found"
            : `${resultCount} ${resultCount === 1 ? "product" : "products"} found`}
        </p>
      )}
    </div>
  );
}
