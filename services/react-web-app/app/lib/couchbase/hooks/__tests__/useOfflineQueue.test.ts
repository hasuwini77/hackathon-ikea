/**
 * Unit tests for useOfflineQueue hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineQueue } from '../useOfflineQueue';
import * as client from '../../client';
import * as useSyncStatusModule from '../useSyncStatus';
import type { QueuedOperation } from '../../types';

// Mock the client module
vi.mock('../../client', () => ({
  putDocument: vi.fn(),
  deleteDocument: vi.fn(),
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

// Mock useSyncStatus hook
vi.mock('../useSyncStatus', () => ({
  useIsOnline: vi.fn(),
}));

const STORAGE_KEY = 'couchbase_offline_queue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with empty queue', () => {
      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queuedOperations).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
    });

    it('should load queue from localStorage on mount', () => {
      const savedQueue: QueuedOperation[] = [
        {
          id: 'op-1',
          type: 'put',
          document: { _id: 'doc-1', _rev: '1-abc', type: 'test' },
          timestamp: new Date('2026-03-08T00:00:00Z'),
          retryCount: 0,
        },
        {
          id: 'op-2',
          type: 'delete',
          document: { _id: 'doc-2', _rev: '1-def' },
          timestamp: new Date('2026-03-08T00:01:00Z'),
          retryCount: 1,
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueue));

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queuedOperations).toHaveLength(2);
      expect(result.current.pendingCount).toBe(2);
      expect(result.current.queuedOperations[0].id).toBe('op-1');
      expect(result.current.queuedOperations[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queuedOperations).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('queueWrite - online scenarios', () => {
    it('should write immediately when online and not queue', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      vi.mocked(client.putDocument).mockResolvedValue({ ok: true, id: 'doc-1', rev: '2-abc' });

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test', name: 'Test' }, '1-abc');
      });

      expect(client.putDocument).toHaveBeenCalledWith(
        'doc-1',
        { type: 'test', name: 'Test' },
        '1-abc'
      );
      expect(result.current.queuedOperations).toHaveLength(0);
      expect(result.current.pendingCount).toBe(0);
    });

    it('should queue write when online but operation fails with offline error', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      const offlineError = new client.CouchbaseClientError('Network error', undefined, true);
      vi.mocked(client.putDocument).mockRejectedValue(offlineError);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
      });

      expect(result.current.queuedOperations).toHaveLength(1);
      expect(result.current.pendingCount).toBe(1);
      expect(result.current.queuedOperations[0].type).toBe('put');
      expect(result.current.queuedOperations[0].document._id).toBe('doc-1');
    });

    it('should throw error when online operation fails with non-offline error', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      const serverError = new client.CouchbaseClientError('Server error', 500, false);
      vi.mocked(client.putDocument).mockRejectedValue(serverError);

      const { result } = renderHook(() => useOfflineQueue());

      await expect(
        act(async () => {
          await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
        })
      ).rejects.toThrow('Server error');

      expect(result.current.queuedOperations).toHaveLength(0);
    });
  });

  describe('queueWrite - offline scenarios', () => {
    it('should queue write operation when offline', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test', name: 'Test' }, '1-abc');
      });

      expect(client.putDocument).not.toHaveBeenCalled();
      expect(result.current.queuedOperations).toHaveLength(1);
      expect(result.current.pendingCount).toBe(1);

      const queuedOp = result.current.queuedOperations[0];
      expect(queuedOp.type).toBe('put');
      expect(queuedOp.document._id).toBe('doc-1');
      expect(queuedOp.document._rev).toBe('1-abc');
      expect(queuedOp.document).toHaveProperty('type', 'test');
      expect(queuedOp.document).toHaveProperty('name', 'Test');
      expect(queuedOp.retryCount).toBe(0);
    });

    it('should queue write without revision', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
      });

      const queuedOp = result.current.queuedOperations[0];
      expect(queuedOp.document._id).toBe('doc-1');
      expect(queuedOp.document._rev).toBeUndefined();
    });
  });

  describe('queueDelete', () => {
    it('should delete immediately when online and not queue', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      vi.mocked(client.deleteDocument).mockResolvedValue({ ok: true, id: 'doc-1', rev: '2-abc' });

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueDelete('doc-1', '1-abc');
      });

      expect(client.deleteDocument).toHaveBeenCalledWith('doc-1', '1-abc');
      expect(result.current.queuedOperations).toHaveLength(0);
    });

    it('should queue delete when offline', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueDelete('doc-1', '1-abc');
      });

      expect(client.deleteDocument).not.toHaveBeenCalled();
      expect(result.current.queuedOperations).toHaveLength(1);

      const queuedOp = result.current.queuedOperations[0];
      expect(queuedOp.type).toBe('delete');
      expect(queuedOp.document._id).toBe('doc-1');
      expect(queuedOp.document._rev).toBe('1-abc');
    });
  });

  describe('localStorage persistence', () => {
    it('should save queue to localStorage when operations are added', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].document._id).toBe('doc-1');
    });

    it('should update localStorage when queue changes', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
        await result.current.queueWrite('doc-2', { type: 'test' });
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
    });

    it('should handle localStorage errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save offline queue:',
        expect.any(Error)
      );

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('retry operations when coming online', () => {
    it('should retry queued operations when coming online', async () => {
      // Start offline with queued operations
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
        await result.current.queueWrite('doc-2', { type: 'test' }, '1-def');
      });

      expect(result.current.queuedOperations).toHaveLength(2);

      // Come online
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      vi.mocked(client.putDocument).mockResolvedValue({ ok: true, id: 'doc-1', rev: '2-abc' });

      rerender();

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });

      expect(client.putDocument).toHaveBeenCalledTimes(2);
    });

    it('should retry delete operations', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueDelete('doc-1', '1-abc');
      });

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      vi.mocked(client.deleteDocument).mockResolvedValue({ ok: true, id: 'doc-1', rev: '2-abc' });

      rerender();

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });

      expect(client.deleteDocument).toHaveBeenCalledWith('doc-1', '1-abc');
    });

    it('should increment retry count on failure', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
      });

      // Come online but operation fails
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      const offlineError = new client.CouchbaseClientError('Still offline', undefined, true);
      vi.mocked(client.putDocument).mockRejectedValue(offlineError);

      rerender();

      await waitFor(() => {
        expect(result.current.queuedOperations[0]?.retryCount).toBeGreaterThan(0);
      });
    });

    it('should respect max retry count', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Start with operation at max retry count
      const maxRetryOp: QueuedOperation = {
        id: 'op-1',
        type: 'put',
        document: { _id: 'doc-1', _rev: '1-abc', type: 'test' },
        timestamp: new Date(),
        retryCount: 5, // Max is 5
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify([maxRetryOp]));

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });

      expect(client.putDocument).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('error handling during retry', () => {
    it('should remove operations that fail with client errors (4xx)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
      });

      // Come online but get conflict error
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      const conflictError = new client.CouchbaseClientError('Conflict', 409, false);
      vi.mocked(client.putDocument).mockRejectedValue(conflictError);

      rerender();

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dropping operation'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });

    it('should keep operations on server errors (5xx)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
      });

      // Come online but get server error
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      const serverError = new client.CouchbaseClientError('Server error', 500, false);
      vi.mocked(client.putDocument).mockRejectedValue(serverError);

      rerender();

      await waitFor(() => {
        expect(result.current.queuedOperations[0]?.retryCount).toBe(1);
      });

      expect(result.current.queuedOperations).toHaveLength(1);

      consoleErrorSpy.mockRestore();
    });

    it('should handle delete operation without revision gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidDeleteOp: QueuedOperation = {
        id: 'op-1',
        type: 'delete',
        document: { _id: 'doc-1' }, // Missing _rev
        timestamp: new Date(),
        retryCount: 0,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify([invalidDeleteOp]));

      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('retryAll', () => {
    it('should manually retry all operations', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' }, '1-abc');
        await result.current.queueWrite('doc-2', { type: 'test' }, '1-def');
      });

      expect(result.current.queuedOperations).toHaveLength(2);

      // Still offline, but manually trigger retry
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      vi.mocked(client.putDocument).mockResolvedValue({ ok: true, id: 'doc', rev: '2-abc' });

      await act(async () => {
        await result.current.retryAll();
      });

      expect(result.current.queuedOperations).toHaveLength(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued operations', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
        await result.current.queueWrite('doc-2', { type: 'test' });
      });

      expect(result.current.queuedOperations).toHaveLength(2);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queuedOperations).toHaveLength(0);
      expect(result.current.pendingCount).toBe(0);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('concurrent processing', () => {
    it('should not process queue concurrently', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
      });

      // Setup slow processing
      let resolvePromise: () => void;
      const slowPromise = new Promise<any>((resolve) => {
        resolvePromise = () => resolve({ ok: true, id: 'doc', rev: '2-abc' });
      });
      vi.mocked(client.putDocument).mockReturnValue(slowPromise);

      // Go online - starts processing
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(true);
      rerender();

      // Try to add another operation while processing
      await act(async () => {
        await result.current.queueWrite('doc-2', { type: 'test' });
      });

      // Resolve the slow operation
      resolvePromise!();

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0);
      });
    });
  });

  describe('operation ID generation', () => {
    it('should generate unique IDs for operations', async () => {
      vi.mocked(useSyncStatusModule.useIsOnline).mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.queueWrite('doc-1', { type: 'test' });
        await result.current.queueWrite('doc-1', { type: 'test' }); // Same doc ID
      });

      const ids = result.current.queuedOperations.map((op) => op.id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toContain('doc-1');
      expect(ids[1]).toContain('doc-1');
    });
  });
});
