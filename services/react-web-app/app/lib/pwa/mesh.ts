import { saveProductToIDB } from "./indexeddb";

// Simulated BLE / Wi-Fi Direct Mesh Network via BroadcastChannel
const MESH_CHANNEL = "ikea-axis-mesh";

export function initMeshNetwork() {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;

    const channel = new BroadcastChannel(MESH_CHANNEL);

    channel.onmessage = async (event) => {
        const { type, payload } = event.data;

        // Simulating receiving a P2P sync packet from another device within BLE range
        if (type === "SYNC_PRODUCT_STOCK") {
            console.log("[MESH] Received P2P stock update:", payload);
            try {
                // Save to our local IndexedDB mirror independently of central server
                await saveProductToIDB(payload);

                // Dispatch local event so UI components can re-render if they are watching
                window.dispatchEvent(
                    new CustomEvent("mesh-stock-updated", { detail: payload })
                );
            } catch (err) {
                console.error("[MESH] Failed to process P2P sync packet", err);
            }
        }
    };

    console.log("[MESH] Local-first mesh network listening on channel:", MESH_CHANNEL);
    return channel;
}

export function broadcastStockUpdate(product: any) {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;

    const channel = new BroadcastChannel(MESH_CHANNEL);
    console.log("[MESH] Broadcasting P2P stock update:", product._id);

    channel.postMessage({
        type: "SYNC_PRODUCT_STOCK",
        payload: product,
    });
}
