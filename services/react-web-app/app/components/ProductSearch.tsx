import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Search, X } from "lucide-react";

interface ProductSearchProps {
  onSearch: (searchTerm: string) => void;
  resultCount?: number;
  placeholder?: string;
  value?: string;
}

/**
 * ProductSearch Component
 *
 * Provides a search input for finding products by name, description, or article number.
 * Features:
 * - Explicit submit via Search button or Enter key
 * - Clear button when text is entered
 * - Shows result count when available
 * - Accessible with proper labels and keyboard navigation
 */
export function ProductSearch({
  onSearch,
  resultCount,
  placeholder = "Search by name, description, or article number...",
  value,
}: ProductSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  const lastExternalValueRef = useRef<string | undefined>(undefined);

  // Support controlled value updates (e.g., barcode scan populating search input)
  useEffect(() => {
    if (value === undefined) return;
    if (value !== lastExternalValueRef.current) {
      setSearchValue(value);
      lastExternalValueRef.current = value;
    }
  }, [value]);

  const handleClear = useCallback(() => {
    setSearchValue("");
    onSearch("");
  }, [onSearch]);

  const handleSubmit = useCallback(() => {
    onSearch(searchValue.trim());
  }, [onSearch, searchValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-28"
          aria-label="Search products"
          aria-describedby={resultCount !== undefined ? "search-results-count" : undefined}
        />
        <Button
          type="button"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8"
          onClick={handleSubmit}
          aria-label="Search products"
        >
          Search
        </Button>
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-16 top-1/2 -translate-y-1/2 h-7 w-7"
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
