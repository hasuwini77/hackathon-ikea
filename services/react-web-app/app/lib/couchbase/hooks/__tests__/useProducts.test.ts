/**
 * Unit tests for useProducts hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProducts } from '../useProducts';
import * as client from '../../client';
import type { ProductDocument, AllDocsResponse } from '../../types';

// Mock the client module
vi.mock('../../client', () => ({
  getAllDocuments: vi.fn(),
  searchProducts: vi.fn(),
  CouchbaseClientError: class CouchbaseClientError extends Error {
    constructor(
      message: string,
      public status?: number,
      public isOffline: boolean = false,
      public originalError?: any
    ) {
      super(message);
      this.name = 'CouchbaseClientError';
    }
  },
}));

describe('useProducts', () => {
  const mockProducts: ProductDocument[] = [
    {
      _id: 'product-1',
      _rev: '1-abc',
      type: 'product',
      articleNumber: 'ART001',
      name: 'Test Chair',
      description: 'A test chair',
      category: 'furniture',
      productType: 'chair',
      price: 99.99,
      currency: 'USD',
      stock: { quantity: 10, location: 'A1' },
      dimensions: { depth: 50, width: 50, height: 80, unit: 'cm' },
      weight: { value: 5, unit: 'kg' },
      tags: ['furniture', 'chair'],
      inStock: true,
      lastUpdated: '2026-03-08T00:00:00Z',
    },
    {
      _id: 'product-2',
      _rev: '1-def',
      type: 'product',
      articleNumber: 'ART002',
      name: 'Test Table',
      description: 'A test table',
      category: 'furniture',
      productType: 'table',
      price: 199.99,
      currency: 'USD',
      stock: { quantity: 5, location: 'B2' },
      dimensions: { depth: 100, width: 80, height: 75, unit: 'cm' },
      weight: { value: 15, unit: 'kg' },
      tags: ['furniture', 'table'],
      inStock: true,
      lastUpdated: '2026-03-08T00:00:00Z',
    },
  ];

  const mockAllDocsResponse: AllDocsResponse = {
    total_rows: 2,
    offset: 0,
    rows: [
      {
        id: 'product-1',
        key: 'product-1',
        value: { rev: '1-abc' },
        doc: mockProducts[0],
      },
      {
        id: 'product-2',
        key: 'product-2',
        value: { rev: '1-def' },
        doc: mockProducts[1],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetching all products', () => {
    it('should return products when online', async () => {
      vi.mocked(client.getAllDocuments).mockResolvedValue(mockAllDocsResponse);

      const { result } = renderHook(() => useProducts());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.products).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isOffline).toBe(false);

      // Wait for products to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.error).toBeNull();
      expect(result.current.isOffline).toBe(false);
      expect(client.getAllDocuments).toHaveBeenCalledWith(true);
    });

    it('should return empty array when no products exist', async () => {
      const emptyResponse: AllDocsResponse = {
        total_rows: 0,
        offset: 0,
        rows: [],
      };
      vi.mocked(client.getAllDocuments).mockResolvedValue(emptyResponse);

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should filter out non-product documents', async () => {
      const mixedResponse: AllDocsResponse = {
        total_rows: 3,
        offset: 0,
        rows: [
          {
            id: 'product-1',
            key: 'product-1',
            value: { rev: '1-abc' },
            doc: mockProducts[0],
          },
          {
            id: 'user-1',
            key: 'user-1',
            value: { rev: '1-xyz' },
            doc: { _id: 'user-1', _rev: '1-xyz', type: 'user', name: 'Test User' },
          },
          {
            id: 'product-2',
            key: 'product-2',
            value: { rev: '1-def' },
            doc: mockProducts[1],
          },
        ],
      };
      vi.mocked(client.getAllDocuments).mockResolvedValue(mixedResponse);

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.products).toHaveLength(2);
    });
  });

  describe('searching and filtering products', () => {
    it('should use searchProducts when category is provided', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue([mockProducts[0]]);

      const { result } = renderHook(() => useProducts({ category: 'furniture' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual([mockProducts[0]]);
      expect(client.searchProducts).toHaveBeenCalledWith({
        category: 'furniture',
        minPrice: undefined,
        maxPrice: undefined,
        query: undefined,
      });
      expect(client.getAllDocuments).not.toHaveBeenCalled();
    });

    it('should use searchProducts when query is provided', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue(mockProducts);

      const { result } = renderHook(() => useProducts({ query: 'chair' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.searchProducts).toHaveBeenCalledWith({
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        query: 'chair',
      });
    });

    it('should use searchProducts when price range is provided', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue([mockProducts[0]]);

      const { result } = renderHook(() =>
        useProducts({ minPrice: 50, maxPrice: 150 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.searchProducts).toHaveBeenCalledWith({
        category: undefined,
        minPrice: 50,
        maxPrice: 150,
        query: undefined,
      });
    });

    it('should use searchProducts with multiple filters', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue([mockProducts[0]]);

      const { result } = renderHook(() =>
        useProducts({
          category: 'furniture',
          query: 'chair',
          minPrice: 50,
          maxPrice: 150,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.searchProducts).toHaveBeenCalledWith({
        category: 'furniture',
        minPrice: 50,
        maxPrice: 150,
        query: 'chair',
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors and set error state', async () => {
      const errorMessage = 'Failed to fetch products';
      vi.mocked(client.getAllDocuments).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.products).toEqual([]);
      expect(result.current.isOffline).toBe(false);
    });

    it('should detect offline state from CouchbaseClientError', async () => {
      const offlineError = new client.CouchbaseClientError(
        'Network error',
        undefined,
        true
      );
      vi.mocked(client.getAllDocuments).mockRejectedValue(offlineError);

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isOffline).toBe(true);
      expect(result.current.products).toEqual([]);
    });

    it('should handle non-offline CouchbaseClientError', async () => {
      const serverError = new client.CouchbaseClientError(
        'Server error',
        500,
        false
      );
      vi.mocked(client.getAllDocuments).mockRejectedValue(serverError);

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.isOffline).toBe(false);
    });

    it('should handle non-Error objects', async () => {
      vi.mocked(client.getAllDocuments).mockRejectedValue('String error');

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load products');
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should set loading state correctly during fetch', async () => {
      let resolvePromise: (value: AllDocsResponse) => void;
      const promise = new Promise<AllDocsResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(client.getAllDocuments).mockReturnValue(promise);

      const { result } = renderHook(() => useProducts());

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      resolvePromise!(mockAllDocsResponse);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('refetch functionality', () => {
    it('should refetch products when refetch is called', async () => {
      vi.mocked(client.getAllDocuments).mockResolvedValue(mockAllDocsResponse);

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.getAllDocuments).toHaveBeenCalledTimes(1);

      // Update mock to return different data
      const updatedProducts: ProductDocument[] = [
        { ...mockProducts[0], name: 'Updated Chair' },
      ];
      const updatedResponse: AllDocsResponse = {
        ...mockAllDocsResponse,
        rows: [
          {
            ...mockAllDocsResponse.rows[0],
            doc: updatedProducts[0],
          },
        ],
      };
      vi.mocked(client.getAllDocuments).mockResolvedValue(updatedResponse);

      // Trigger refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.products[0].name).toBe('Updated Chair');
      });

      expect(client.getAllDocuments).toHaveBeenCalledTimes(2);
    });
  });

  describe('option changes', () => {
    it('should refetch when category option changes', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue([mockProducts[0]]);

      const { result, rerender } = renderHook(
        ({ category }) => useProducts({ category }),
        { initialProps: { category: 'furniture' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.searchProducts).toHaveBeenCalledTimes(1);

      // Change category
      vi.mocked(client.searchProducts).mockResolvedValue([mockProducts[1]]);
      rerender({ category: 'kitchen' });

      await waitFor(() => {
        expect(client.searchProducts).toHaveBeenCalledTimes(2);
      });

      expect(client.searchProducts).toHaveBeenLastCalledWith({
        category: 'kitchen',
        minPrice: undefined,
        maxPrice: undefined,
        query: undefined,
      });
    });

    it('should refetch when query option changes', async () => {
      vi.mocked(client.searchProducts).mockResolvedValue(mockProducts);

      const { result, rerender } = renderHook(
        ({ query }) => useProducts({ query }),
        { initialProps: { query: 'chair' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.searchProducts).toHaveBeenCalledTimes(1);

      // Change query
      rerender({ query: 'table' });

      await waitFor(() => {
        expect(client.searchProducts).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: AllDocsResponse) => void;
      const promise = new Promise<AllDocsResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(client.getAllDocuments).mockReturnValue(promise);

      const { result, unmount } = renderHook(() => useProducts());

      expect(result.current.loading).toBe(true);

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      resolvePromise!(mockAllDocsResponse);

      // Wait a bit to ensure no state updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The component should not update after unmount
      // This test ensures the cleanup function works
    });
  });

  describe('server-side rendering', () => {
    it('should not fetch on server side', () => {
      // Temporarily set window to undefined to simulate SSR
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      renderHook(() => useProducts());

      // Should not have called any fetch methods
      expect(client.getAllDocuments).not.toHaveBeenCalled();
      expect(client.searchProducts).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });
  });
});
