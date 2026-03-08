import { useSyncStatus } from "~/lib/couchbase";
import { Badge } from "~/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * SyncStatus Component
 *
 * Displays the current connectivity and synchronization status in the header.
 * Shows different states with appropriate icons and colors:
 * - Online & Synced (green)
 * - Syncing (blue with spinner)
 * - Offline (yellow)
 * - Stale sync (orange)
 * - Pending changes indicator
 */
export function SyncStatus() {
  const { isOnline, lastSynced, pendingChanges, error: syncError } = useSyncStatus();

  // Determine if last sync is stale (more than 10 minutes ago)
  const isStale = lastSynced
    ? Date.now() - lastSynced.getTime() > 10 * 60 * 1000
    : true;

  // Simulate isSyncing state (Couchbase hook doesn't provide this)
  const isSyncing = false;

  const getStatusConfig = () => {
    if (syncError) {
      return {
        variant: "destructive" as const,
        icon: <AlertCircle className="h-3 w-3" />,
        text: "Sync Error",
        description: syncError,
      };
    }

    if (!isOnline) {
      return {
        variant: "secondary" as const,
        icon: <WifiOff className="h-3 w-3" />,
        text: "Offline",
        description: "Working in offline mode",
      };
    }

    if (isSyncing) {
      return {
        variant: "default" as const,
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: "Syncing...",
        description: "Synchronizing data",
      };
    }

    if (isStale && lastSynced) {
      return {
        variant: "outline" as const,
        icon: <Clock className="h-3 w-3" />,
        text: `Last sync: ${formatDistanceToNow(lastSynced, { addSuffix: true })}`,
        description: "Sync may be stale",
      };
    }

    return {
      variant: "default" as const,
      icon: <Wifi className="h-3 w-3" />,
      text: "Synced",
      description: "All data is up to date",
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex items-center justify-between gap-3 bg-card border-b px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Badge
          variant={statusConfig.variant}
          className="flex items-center gap-1.5"
          aria-live="polite"
          aria-label={`Sync status: ${statusConfig.text}`}
        >
          {statusConfig.icon}
          <span className="text-xs font-medium">{statusConfig.text}</span>
        </Badge>

        {pendingChanges > 0 && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300"
            aria-label={`${pendingChanges} pending changes`}
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span className="text-xs font-medium">
              {pendingChanges} pending
            </span>
          </Badge>
        )}
      </div>

      {/* Connection indicator dot */}
      <div className="flex items-center gap-2" aria-hidden="true">
        <div className="relative">
          <div
            className={`h-2 w-2 rounded-full ${
              isOnline
                ? "bg-green-500"
                : "bg-yellow-500"
            }`}
          />
          {isOnline && !isSyncing && !isStale && (
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {isOnline ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
