/**
 * React hook to monitor sync status and connectivity
 */

import { useState, useEffect, useCallback } from 'react';
import { checkServerStatus, getDatabaseInfo } from '../client';
import { SYNC_STATUS_POLL_INTERVAL } from '../config';
import type { SyncStatus } from '../types';
import { useOfflineQueue } from './useOfflineQueue';

interface UseSyncStatusOptions {
  pollInterval?: number;
  enabled?: boolean;
}

interface UseSyncStatusResult extends SyncStatus {
  refetch: () => void;
}

/**
 * Hook to monitor Edge Server connectivity and sync status
 *
 * @param options - Configuration for polling and enabling
 * @returns Sync status information including online state and pending changes from offline queue
 */
export function useSyncStatus(
  options: UseSyncStatusOptions = {}
): UseSyncStatusResult {
  const {
    pollInterval = SYNC_STATUS_POLL_INTERVAL,
    enabled = true,
  } = options;

  // Get the actual pending count from the offline queue
  const { pendingCount } = useOfflineQueue();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    pendingChanges: 0,
  });
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function checkStatus() {
      try {
        // Check if server is reachable
        const isOnline = await checkServerStatus();

        if (!cancelled) {
          if (isOnline) {
            // If online, get database info for more details
            try {
              const dbInfo = await getDatabaseInfo();

              setSyncStatus({
                isOnline: true,
                lastSynced: new Date(),
                pendingChanges: pendingCount,
                error: undefined,
              });
            } catch (err) {
              // Server responded but couldn't get DB info
              setSyncStatus({
                isOnline: true,
                lastSynced: new Date(),
                pendingChanges: pendingCount,
                error: err instanceof Error ? err.message : 'Failed to get database info',
              });
            }
          } else {
            // Server is offline
            setSyncStatus(prev => ({
              isOnline: false,
              lastSynced: prev.lastSynced,
              pendingChanges: pendingCount,
              error: 'Edge Server is offline',
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSyncStatus(prev => ({
            isOnline: false,
            lastSynced: prev.lastSynced,
            pendingChanges: pendingCount,
            error: err instanceof Error ? err.message : 'Status check failed',
          }));
        }
      }

      // Schedule next check
      if (!cancelled) {
        timeoutId = setTimeout(checkStatus, pollInterval);
      }
    }

    // Initial check
    checkStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, pollInterval, refetchTrigger, pendingCount]);

  return {
    ...syncStatus,
    refetch,
  };
}

/**
 * Hook to track online/offline state only (lightweight version)
 *
 * @returns Boolean indicating if Edge Server is online
 */
export function useIsOnline(pollInterval: number = 5000): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function checkOnlineStatus() {
      try {
        const online = await checkServerStatus();
        if (!cancelled) {
          setIsOnline(online);
        }
      } catch {
        if (!cancelled) {
          setIsOnline(false);
        }
      }

      if (!cancelled) {
        timeoutId = setTimeout(checkOnlineStatus, pollInterval);
      }
    }

    checkOnlineStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pollInterval]);

  return isOnline;
}
