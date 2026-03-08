/**
 * Unit tests for useSyncStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSyncStatus, useIsOnline } from '../useSyncStatus';
import * as client from '../../client';
import * as useOfflineQueueModule from '../useOfflineQueue';

// Mock the client module
vi.mock('../../client', () => ({
  checkServerStatus: vi.fn(),
  getDatabaseInfo: vi.fn(),
}));

// Mock useOfflineQueue hook
vi.mock('../useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(),
}));

describe('useSyncStatus', () => {
  const mockDatabaseInfo = {
    db_name: 'products',
    doc_count: 100,
    update_seq: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useOfflineQueueModule.useOfflineQueue).mockReturnValue({
      queuedOperations: [],
      pendingCount: 0,
      queueWrite: vi.fn(),
      queueDelete: vi.fn(),
      retryAll: vi.fn(),
      clearQueue: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('online state', () => {
    it('should return correct online state when server is reachable', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      expect(result.current.lastSynced).toBeInstanceOf(Date);
      expect(result.current.pendingChanges).toBe(0);
      expect(result.current.error).toBeUndefined();
    });

    it('should return correct online state even when DB info fails', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockRejectedValue(new Error('DB info failed'));

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      expect(result.current.error).toBe('DB info failed');
      expect(result.current.lastSynced).toBeInstanceOf(Date);
    });
  });

  describe('offline state', () => {
    it('should return correct offline state when server is unreachable', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(false);

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      expect(result.current.error).toBe('Edge Server is offline');
      expect(result.current.pendingChanges).toBe(0);
    });

    it('should preserve lastSynced timestamp when going offline', async () => {
      // Start online
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result } = renderHook(() => useSyncStatus({ pollInterval: 1000 }));

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      const lastSyncedWhenOnline = result.current.lastSynced;
      expect(lastSyncedWhenOnline).toBeInstanceOf(Date);

      // Go offline
      vi.mocked(client.checkServerStatus).mockResolvedValue(false);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // lastSynced should be preserved
      expect(result.current.lastSynced).toBe(lastSyncedWhenOnline);
    });

    it('should handle errors during status check', async () => {
      vi.mocked(client.checkServerStatus).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('pending changes integration', () => {
    it('should integrate pendingChanges from offline queue', async () => {
      vi.mocked(useOfflineQueueModule.useOfflineQueue).mockReturnValue({
        queuedOperations: [
          {
            id: 'op-1',
            type: 'put',
            document: { _id: 'doc-1', _rev: '1-abc' },
            timestamp: new Date(),
            retryCount: 0,
          },
          {
            id: 'op-2',
            type: 'put',
            document: { _id: 'doc-2', _rev: '1-def' },
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
        pendingCount: 2,
        queueWrite: vi.fn(),
        queueDelete: vi.fn(),
        retryAll: vi.fn(),
        clearQueue: vi.fn(),
      });

      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(2);
      });
    });

    it('should update pendingChanges when queue changes', async () => {
      const mockQueue = {
        queuedOperations: [],
        pendingCount: 0,
        queueWrite: vi.fn(),
        queueDelete: vi.fn(),
        retryAll: vi.fn(),
        clearQueue: vi.fn(),
      };

      vi.mocked(useOfflineQueueModule.useOfflineQueue).mockReturnValue(mockQueue);
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result, rerender } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(0);
      });

      // Update mock to return different pending count
      mockQueue.pendingCount = 3;
      rerender();

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(3);
      });
    });
  });

  describe('polling interval', () => {
    it('should poll at specified interval', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      renderHook(() => useSyncStatus({ pollInterval: 2000 }));

      // Initial call
      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
      });

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
      });

      // Advance timer again
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(3);
      });
    });

    it('should use default poll interval when not specified', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
      });

      // Default interval is 5000ms
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
      });
    });

    it('should continue polling after errors', async () => {
      vi.mocked(client.checkServerStatus)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce(true)
        .mockResolvedValue(true);

      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result } = renderHook(() => useSyncStatus({ pollInterval: 1000 }));

      // First call - error
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Second call - success
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('refetch functionality', () => {
    it('should trigger status check when refetch is called', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
      });

      // Call refetch
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('enabled option', () => {
    it('should not check status when enabled is false', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);

      renderHook(() => useSyncStatus({ enabled: false }));

      // Wait a bit
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(client.checkServerStatus).not.toHaveBeenCalled();
    });

    it('should check status when enabled is true', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      renderHook(() => useSyncStatus({ enabled: true }));

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const { unmount } = renderHook(() => useSyncStatus({ pollInterval: 1000 }));

      await waitFor(() => {
        expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance timer after unmount
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not have made another call
      expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
    });

    it('should not update state after unmount', async () => {
      let resolvePromise: (value: boolean) => void;
      const promise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(client.checkServerStatus).mockReturnValue(promise);

      const { unmount } = renderHook(() => useSyncStatus());

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      resolvePromise!(true);

      // Wait a bit
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Component should not have thrown any errors
    });
  });

  describe('lastSynced timestamp', () => {
    it('should update lastSynced timestamp on successful check', async () => {
      vi.mocked(client.checkServerStatus).mockResolvedValue(true);
      vi.mocked(client.getDatabaseInfo).mockResolvedValue(mockDatabaseInfo);

      const beforeCheck = new Date();

      const { result } = renderHook(() => useSyncStatus());

      await waitFor(() => {
        expect(result.current.lastSynced).toBeInstanceOf(Date);
      });

      const afterCheck = new Date();

      expect(result.current.lastSynced!.getTime()).toBeGreaterThanOrEqual(
        beforeCheck.getTime()
      );
      expect(result.current.lastSynced!.getTime()).toBeLessThanOrEqual(
        afterCheck.getTime()
      );
    });
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true when server is online', async () => {
    vi.mocked(client.checkServerStatus).mockResolvedValue(true);

    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false when server is offline', async () => {
    vi.mocked(client.checkServerStatus).mockResolvedValue(false);

    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should poll at specified interval', async () => {
    vi.mocked(client.checkServerStatus).mockResolvedValue(true);

    renderHook(() => useIsOnline(2000));

    await waitFor(() => {
      expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('should use default interval of 5000ms', async () => {
    vi.mocked(client.checkServerStatus).mockResolvedValue(true);

    renderHook(() => useIsOnline());

    await waitFor(() => {
      expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(client.checkServerStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle errors and return false', async () => {
    vi.mocked(client.checkServerStatus).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should update state when status changes', async () => {
    vi.mocked(client.checkServerStatus)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);

    const { result } = renderHook(() => useIsOnline(1000));

    // First check - online
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Second check - offline
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Third check - online again
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should cleanup timeout on unmount', async () => {
    vi.mocked(client.checkServerStatus).mockResolvedValue(true);

    const { unmount } = renderHook(() => useIsOnline(1000));

    await waitFor(() => {
      expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not make another call after unmount
    expect(client.checkServerStatus).toHaveBeenCalledTimes(1);
  });
});
