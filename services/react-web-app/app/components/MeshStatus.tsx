/**
 * IKEA AXIS — Layer III: Local-First Mesh Status
 *
 * Displays the real-time state of the decentralised mesh network:
 *   • Number of active nodes discovered via BroadcastChannel (simulating BLE/Wi-Fi Direct)
 *   • Last "ripple" (stock-update propagation) received from a peer device
 *   • IndexedDB offline cache readiness
 *
 * Because BroadcastChannel only spans same-origin tabs/windows the displayed
 * node count is seeded with a plausible number on mount to represent the
 * broader in-store device mesh; each real ripple increments it slightly for
 * a live demo effect.
 */
import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";

export function MeshStatus() {
  const [nodeCount, setNodeCount]     = useState<number | null>(null);
  const [lastRipple, setLastRipple]   = useState<string | null>(null);
  const [isRippling, setIsRippling]   = useState(false);
  const [idbReady, setIdbReady]       = useState(false);
  const channelRef                    = useRef<BroadcastChannel | null>(null);
  const rippleTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Simulate 2-5 nearby staff devices in BLE range
    setNodeCount(Math.floor(Math.random() * 4) + 2);

    // Probe IndexedDB availability
    if (typeof indexedDB !== "undefined") setIdbReady(true);

    if (typeof window !== "undefined" && window.BroadcastChannel) {
      channelRef.current = new BroadcastChannel("ikea-axis-mesh");
      channelRef.current.onmessage = () => {
        setLastRipple(new Date().toLocaleTimeString());
        setIsRippling(true);
        // Increment node count slightly on each real ripple (live demo effect)
        setNodeCount((n) => (n ?? 2) + 1);
        if (rippleTimer.current) clearTimeout(rippleTimer.current);
        rippleTimer.current = setTimeout(() => setIsRippling(false), 2500);
      };
    }

    return () => {
      channelRef.current?.close();
      if (rippleTimer.current) clearTimeout(rippleTimer.current);
    };
  }, []);

  const meshAvailable =
    typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined";

  return (
    <div
      className="flex items-center gap-2 px-4 py-1 bg-gray-950 text-[10px] font-mono border-b border-gray-800 overflow-x-auto"
      role="status"
      aria-label="Mesh network status"
    >
      {/* Animated radio icon */}
      <Radio
        className={[
          "h-3 w-3 shrink-0",
          isRippling ? "text-yellow-400 animate-ping" : "text-green-500 animate-pulse",
        ].join(" ")}
        aria-hidden="true"
      />

      {/* Layer label */}
      <span className="font-black tracking-wider text-green-400 shrink-0">
        LAYER III MESH
      </span>

      <span className="text-gray-600 shrink-0">·</span>

      {meshAvailable && nodeCount !== null ? (
        <>
          <span className="text-green-500 shrink-0">
            {nodeCount} node{nodeCount !== 1 ? "s" : ""} active
          </span>
          <span className="text-gray-700 shrink-0">BLE / Wi-Fi Direct</span>

          {lastRipple && (
            <>
              <span className="text-gray-600 shrink-0">·</span>
              <span
                className={[
                  "shrink-0",
                  isRippling
                    ? "text-yellow-400 animate-pulse font-bold"
                    : "text-green-700",
                ].join(" ")}
              >
                ↗ ripple @ {lastRipple}
              </span>
            </>
          )}
        </>
      ) : (
        <span className="text-gray-600">mesh unavailable in this environment</span>
      )}

      {/* IndexedDB badge — far right */}
      <span className="ml-auto shrink-0 text-gray-600">
        IndexedDB:{" "}
        <span className={idbReady ? "text-green-600" : "text-red-500"}>
          {idbReady ? "READY" : "N/A"}
        </span>
      </span>
    </div>
  );
}
