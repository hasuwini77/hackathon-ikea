/**
 * Unit tests for useUpdateStock hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUpdateStock } from '../useUpdateStock';
import * as client from '../../client';
import * as useOfflineQueueModule from '../useOfflineQueue';
import type { ProductDocument } from '../../types';

// Mock the client module
vi.mock('../../client', () => ({
  getDocument: vi.fn(),
  putDocument: vi.fn(),
}));

// Mock useOfflineQueue hook
vi.mock('../useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(),
}));

describe('useUpdateStock', () => {
  const mockQueueWrite = vi.fn();

  const mockProductWithNumberStock: ProductDocument = {
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
    stock: 10,
    dimensions: { depth: 50, width: 50, height: 80, unit: 'cm' },
    weight: { value: 5, unit: 'kg' },
    tags: ['furniture', 'chair'],
    inStock: true,
    lastUpdated: '2026-03-08T00:00:00Z',
  };

  const mockProductWithObjectStock: ProductDocument = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOfflineQueueModule.useOfflineQueue).mockReturnValue({
      queuedOperations: [],
      pendingCount: 0,
      queueWrite: mockQueueWrite,
      queueDelete: vi.fn(),
      retryAll: vi.fn(),
      clearQueue: vi.fn(),
    });
  });

  describe('successful stock updates', () => {
    it('should update stock successfully when online (number format)', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.updateStock('product-1', 20);
      });

      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(client.getDocument).toHaveBeenCalledWith('product-1');

      // Verify queueWrite was called with correct data
      expect(mockQueueWrite).toHaveBeenCalledWith(
        'product-1',
        expect.objectContaining({
          stock: 20,
          type: 'product',
          name: 'Test Chair',
        }),
        '1-abc'
      );

      // Verify lastUpdated was set
      const callArgs = mockQueueWrite.mock.calls[0];
      expect(callArgs[1].lastUpdated).toBeDefined();
    });

    it('should update stock successfully when online (object format)', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithObjectStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-2', 15);
      });

      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify stock object preserves location
      expect(mockQueueWrite).toHaveBeenCalledWith(
        'product-2',
        expect.objectContaining({
          stock: {
            quantity: 15,
            location: 'B2',
          },
        }),
        '1-def'
      );
    });

    it('should preserve document structure except _id and _rev', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithObjectStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-2', 15);
      });

      const callArgs = mockQueueWrite.mock.calls[0];
      const updatedDoc = callArgs[1];

      // Should not include _id or _rev in document data
      expect(updatedDoc).not.toHaveProperty('_id');
      expect(updatedDoc).not.toHaveProperty('_rev');

      // Should preserve all other fields
      expect(updatedDoc.type).toBe('product');
      expect(updatedDoc.name).toBe('Test Table');
      expect(updatedDoc.category).toBe('furniture');
      expect(updatedDoc.price).toBe(199.99);
    });
  });

  describe('offline scenarios', () => {
    it('should queue update when offline', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-1', 25);
      });

      expect(mockQueueWrite).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle errors when fetching document', async () => {
      const errorMessage = 'Failed to fetch document';
      vi.mocked(client.getDocument).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useUpdateStock());

      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow(errorMessage);

      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle errors when document has no revision', async () => {
      const productWithoutRev = { ...mockProductWithNumberStock };
      delete productWithoutRev._rev;
      vi.mocked(client.getDocument).mockResolvedValue(productWithoutRev);

      const { result } = renderHook(() => useUpdateStock());

      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow('Document revision not found');

      expect(result.current.error).toBe('Document revision not found');
    });

    it('should handle errors during queueWrite', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      const queueError = new Error('Queue write failed');
      mockQueueWrite.mockRejectedValue(queueError);

      const { result } = renderHook(() => useUpdateStock());

      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow('Queue write failed');

      expect(result.current.error).toBe('Queue write failed');
    });

    it('should handle non-Error objects', async () => {
      vi.mocked(client.getDocument).mockRejectedValue('String error');

      const { result } = renderHook(() => useUpdateStock());

      // The hook throws the original error but sets error state to 'Failed to update stock'
      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toBe('String error');

      expect(result.current.error).toBe('Failed to update stock');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      vi.mocked(client.getDocument).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateStock());

      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating stock:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updating state', () => {
    it('should set updating to true during update', async () => {
      let resolveGetDocument: (value: ProductDocument) => void;
      const getDocumentPromise = new Promise<ProductDocument>((resolve) => {
        resolveGetDocument = resolve;
      });
      vi.mocked(client.getDocument).mockReturnValue(getDocumentPromise);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      const updatePromise = act(async () => {
        await result.current.updateStock('product-1', 20);
      });

      // Should be updating while promise is pending
      await waitFor(() => {
        expect(result.current.updating).toBe(true);
      });

      // Resolve the promise
      resolveGetDocument!(mockProductWithNumberStock);
      await updatePromise;

      expect(result.current.updating).toBe(false);
    });

    it('should reset updating state even on error', async () => {
      vi.mocked(client.getDocument).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useUpdateStock());

      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow();

      expect(result.current.updating).toBe(false);
    });

    it('should clear error state on successful update', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      // First, trigger an error
      vi.mocked(client.getDocument).mockRejectedValueOnce(new Error('First error'));
      await expect(
        act(async () => {
          await result.current.updateStock('product-1', 20);
        })
      ).rejects.toThrow();

      expect(result.current.error).toBe('First error');

      // Now do a successful update
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      await act(async () => {
        await result.current.updateStock('product-1', 25);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('stock format handling', () => {
    it('should maintain number stock format', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-1', 30);
      });

      const callArgs = mockQueueWrite.mock.calls[0];
      expect(typeof callArgs[1].stock).toBe('number');
      expect(callArgs[1].stock).toBe(30);
    });

    it('should maintain object stock format with location', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithObjectStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-2', 30);
      });

      const callArgs = mockQueueWrite.mock.calls[0];
      expect(typeof callArgs[1].stock).toBe('object');
      expect(callArgs[1].stock).toEqual({
        quantity: 30,
        location: 'B2',
      });
    });

    it('should handle stock object with additional properties', async () => {
      const productWithExtraProps: ProductDocument = {
        ...mockProductWithObjectStock,
        stock: {
          quantity: 5,
          location: 'B2',
          reserved: 2,
          warehouse: 'Main',
        } as any,
      };
      vi.mocked(client.getDocument).mockResolvedValue(productWithExtraProps);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-2', 30);
      });

      const callArgs = mockQueueWrite.mock.calls[0];
      expect(callArgs[1].stock).toEqual({
        quantity: 30,
        location: 'B2',
        reserved: 2,
        warehouse: 'Main',
      });
    });
  });

  describe('multiple updates', () => {
    it('should handle multiple sequential updates', async () => {
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-1', 20);
      });

      await act(async () => {
        await result.current.updateStock('product-1', 25);
      });

      await act(async () => {
        await result.current.updateStock('product-1', 30);
      });

      expect(mockQueueWrite).toHaveBeenCalledTimes(3);
      expect(result.current.error).toBeNull();
    });
  });

  describe('timestamp handling', () => {
    it('should set lastUpdated timestamp', async () => {
      const beforeUpdate = new Date().toISOString();
      vi.mocked(client.getDocument).mockResolvedValue(mockProductWithNumberStock);
      mockQueueWrite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateStock());

      await act(async () => {
        await result.current.updateStock('product-1', 20);
      });

      const afterUpdate = new Date().toISOString();
      const callArgs = mockQueueWrite.mock.calls[0];
      const timestamp = callArgs[1].lastUpdated;
      const timestampMs = Date.parse(timestamp);

      expect(timestamp).toBeDefined();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(timestampMs).toBeGreaterThanOrEqual(Date.parse(beforeUpdate));
      expect(timestampMs).toBeLessThanOrEqual(Date.parse(afterUpdate));
    });
  });
});
