import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useProducts, productDocumentsToProducts } from "~/lib/couchbase";
import { cn } from "~/lib/utils";
import type { Product } from "~/types/product";

export function meta() {
  return [
    { title: "IKEA Multi-Floor Map - Staff Finder" },
    { name: "description", content: "Detailed multi-floor map with escalators, floorplates, and product routes" },
  ];
}

type ZoneId = "showroom" | "market" | "warehouse";
type FloorId = "L1" | "L0" | "B1";
type StockTier = "out" | "low" | "ok";

interface Point {
  x: number;
  y: number;
}

interface MapLocationInfo {
  zone: ZoneId;
  floor: FloorId;
  aisle: number;
  bay: number;
  section: string;
  key: string;
}

type LocatedProduct = Product & { mapLocation: MapLocationInfo };

interface AisleGeometry {
  aisle: number;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: "horizontal" | "vertical";
  section: string;
}

interface Connector {
  id: string;
  label: string;
  kind: "escalator" | "elevator" | "stairs";
  x: number;
  y: number;
}

interface MarkerPoint {
  product: LocatedProduct;
  x: number;
  y: number;
  tier: StockTier;
}

const LOW_STOCK_THRESHOLD = 10;
const FLOOR_ORDER: FloorId[] = ["L1", "L0", "B1"];

const floorMeta: Record<
  FloorId,
  {
    label: string;
    title: string;
    description: string;
    zone: ZoneId;
    entry: Point;
    shellFill: string;
    shellStroke: string;
  }
> = {
  L1: {
    label: "Level 1",
    title: "Showroom Loop",
    description: "Inspirational room sets and planning areas",
    zone: "showroom",
    entry: { x: 600, y: 120 },
    shellFill: "#f8fbff",
    shellStroke: "#93c5fd",
  },
  L0: {
    label: "Ground",
    title: "Market Hall",
    description: "Accessories, checkout, and customer services",
    zone: "market",
    entry: { x: 600, y: 700 },
    shellFill: "#f6fffb",
    shellStroke: "#86efac",
  },
  B1: {
    label: "Basement",
    title: "Warehouse",
    description: "Bulk racks, pallet lanes, and dispatch",
    zone: "warehouse",
    entry: { x: 600, y: 120 },
    shellFill: "#fffbf2",
    shellStroke: "#fcd34d",
  },
};

const zoneMeta: Record<ZoneId, { label: string; icon: typeof Store }> = {
  showroom: { label: "Showroom", icon: ShoppingBag },
  market: { label: "Market Hall", icon: Store },
  warehouse: { label: "Warehouse", icon: Warehouse },
};

const connectors: Connector[] = [
  { id: "west", label: "Escalator West", kind: "escalator", x: 210, y: 130 },
  { id: "central", label: "Lift Core", kind: "elevator", x: 600, y: 130 },
  { id: "east", label: "Stairs East", kind: "stairs", x: 990, y: 130 },
];

function buildShowroomAisles(): AisleGeometry[] {
  const layout: Array<[number, number, number, number, number, string]> = [
    [1, 120, 140, 130, 62, "Living"],
    [2, 270, 140, 130, 62, "Living"],
    [3, 420, 140, 130, 62, "Living"],
    [4, 620, 140, 130, 62, "Bedroom"],
    [5, 770, 140, 130, 62, "Bedroom"],
    [6, 920, 140, 130, 62, "Bedroom"],
    [7, 920, 260, 130, 62, "Kitchen"],
    [8, 770, 260, 130, 62, "Kitchen"],
    [9, 620, 260, 130, 62, "Kitchen"],
    [10, 420, 260, 130, 62, "Workspace"],
    [11, 270, 260, 130, 62, "Workspace"],
    [12, 120, 260, 130, 62, "Workspace"],
    [13, 120, 390, 150, 70, "Kids"],
    [14, 320, 390, 170, 70, "Textiles"],
    [15, 540, 390, 170, 70, "Planning"],
  ];

  return layout.map(([aisle, x, y, width, height, section]) => ({
    aisle,
    x,
    y,
    width,
    height,
    orientation: "horizontal",
    section,
  }));
}

function buildMarketAisles(): AisleGeometry[] {
  const rows = ["Cookshop", "Dining", "Lighting", "Decor"];
  const aisles: AisleGeometry[] = [];
  let aisle = 16;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      aisles.push({
        aisle,
        x: 120 + col * 200,
        y: 170 + row * 108,
        width: 150,
        height: 64,
        orientation: "horizontal",
        section: rows[row],
      });
      aisle += 1;
    }
  }

  return aisles;
}

function buildWarehouseAisles(): AisleGeometry[] {
  const aisles: AisleGeometry[] = [];
  let aisle = 36;

  for (let col = 0; col < 25; col += 1) {
    aisles.push({
      aisle,
      x: 95 + col * 41,
      y: 180,
      width: 22,
      height: 430,
      orientation: "vertical",
      section: col < 8 ? "Bulk" : col < 16 ? "Pallet" : "Dispatch",
    });
    aisle += 1;
  }

  return aisles;
}

const floorAisles: Record<FloorId, AisleGeometry[]> = {
  L1: buildShowroomAisles(),
  L0: buildMarketAisles(),
  B1: buildWarehouseAisles(),
};

function inferZone(rawZone: string | undefined, aisle: number): ZoneId {
  const zone = rawZone?.toLowerCase() ?? "";
  if (zone.includes("showroom")) return "showroom";
  if (zone.includes("market")) return "market";
  if (zone.includes("warehouse")) return "warehouse";

  if (aisle <= 15) return "showroom";
  if (aisle <= 35) return "market";
  return "warehouse";
}

function inferFloor(zone: ZoneId, aisle: number): FloorId {
  if (zone === "showroom") return "L1";
  if (zone === "market") return "L0";
  if (zone === "warehouse") return "B1";

  if (aisle <= 15) return "L1";
  if (aisle <= 35) return "L0";
  return "B1";
}

function parseLocation(product: Product): MapLocationInfo | null {
  const aisle = Number.parseInt(product.location.aisle, 10);
  const bay = Number.parseInt(product.location.bay, 10);

  if (!Number.isFinite(aisle) || !Number.isFinite(bay) || aisle < 1 || bay < 1) {
    return null;
  }

  const zone = inferZone(product.location.zone, aisle);
  const floor = inferFloor(zone, aisle);
  const section = (product.location.section || "A").trim().toUpperCase();

  return {
    zone,
    floor,
    aisle,
    bay,
    section,
    key: `${floor}:${aisle}:${bay}`,
  };
}

function parseQueryNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function stockTier(quantity: number): StockTier {
  if (quantity <= 0) return "out";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

function stockTierRank(quantity: number): number {
  const tier = stockTier(quantity);
  if (tier === "out") return 0;
  if (tier === "low") return 1;
  return 2;
}

function stockBadgeVariant(quantity: number): "default" | "secondary" | "destructive" {
  const tier = stockTier(quantity);
  if (tier === "out") return "destructive";
  if (tier === "low") return "secondary";
  return "default";
}

function stockColor(quantity: number): string {
  const tier = stockTier(quantity);
  if (tier === "out") return "#dc2626";
  if (tier === "low") return "#d97706";
  return "#15803d";
}

function queryScore(product: LocatedProduct, query: string): number {
  if (!query) return 0;

  const q = query.toLowerCase();
  const article = product.articleNumber.toLowerCase();
  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();

  if (article === q) return 120;
  if (article.startsWith(q)) return 90;
  if (name.startsWith(q)) return 75;
  if (name.includes(q)) return 60;
  if (category.includes(q)) return 40;
  return 0;
}

function connectorSymbol(kind: Connector["kind"]): string {
  if (kind === "escalator") return "ESC";
  if (kind === "elevator") return "LIFT";
  return "STAIR";
}

function bayRatio(bay: number): number {
  const clamped = Math.max(1, Math.min(12, bay));
  return (clamped - 1) / 11;
}

function fallbackAisleGeometry(floor: FloorId, aisle: number): AisleGeometry {
  const templates = floorAisles[floor];
  const index = Math.abs(aisle) % templates.length;
  const template = templates[index];
  return { ...template, aisle };
}

function getAisleGeometry(floor: FloorId, aisle: number): AisleGeometry {
  const found = floorAisles[floor].find((item) => item.aisle === aisle);
  if (found) return found;
  return fallbackAisleGeometry(floor, aisle);
}

function getMarkerPoint(aisle: AisleGeometry, bay: number): Point {
  const ratio = bayRatio(bay);
  if (aisle.orientation === "vertical") {
    return {
      x: aisle.x + aisle.width / 2,
      y: aisle.y + 12 + ratio * (aisle.height - 24),
    };
  }

  return {
    x: aisle.x + 12 + ratio * (aisle.width - 24),
    y: aisle.y + aisle.height / 2,
  };
}

function compactPath(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (!prev || prev.x !== point.x || prev.y !== point.y) {
      out.push(point);
    }
  }
  return out;
}

function toPolyline(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderFloorScenery(floor: FloorId) {
  if (floor === "L1") {
    const rooms = [
      { x: 105, y: 112, w: 460, h: 105, label: "Living Worlds" },
      { x: 590, y: 112, w: 430, h: 105, label: "Bedrooms" },
      { x: 590, y: 238, w: 430, h: 105, label: "Kitchens" },
      { x: 105, y: 238, w: 460, h: 105, label: "Workspaces" },
      { x: 105, y: 368, w: 185, h: 118, label: "Kids" },
      { x: 310, y: 368, w: 200, h: 118, label: "Textiles" },
      { x: 530, y: 368, w: 200, h: 118, label: "Planning Studio" },
      { x: 750, y: 368, w: 270, h: 118, label: "Restaurant Balcony" },
    ];

    return (
      <g>
        <rect x="70" y="90" width="1060" height="600" rx="24" fill="#f8fbff" stroke="#93c5fd" strokeWidth="3" />
        <path
          d="M130 520 L1010 520 L1010 460 L130 460 L130 360 L1010 360 L1010 220 L130 220"
          fill="none"
          stroke="#bfdbfe"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M130 520 L1010 520 L1010 460 L130 460 L130 360 L1010 360 L1010 220 L130 220"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="10 8"
        />
        {rooms.map((room) => (
          <g key={room.label}>
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 4} textAnchor="middle" fontSize="16" fill="#1e3a8a" fontWeight="600">
              {room.label}
            </text>
          </g>
        ))}
      </g>
    );
  }

  if (floor === "L0") {
    return (
      <g>
        <rect x="70" y="90" width="1060" height="600" rx="24" fill="#f6fffb" stroke="#86efac" strokeWidth="3" />
        <rect x="100" y="110" width="290" height="90" rx="14" fill="#dcfce7" stroke="#86efac" strokeWidth="2" />
        <text x="245" y="162" textAnchor="middle" fontSize="15" fill="#14532d" fontWeight="600">
          Bistro + Cafe
        </text>

        <rect x="810" y="110" width="290" height="90" rx="14" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2" />
        <text x="955" y="162" textAnchor="middle" fontSize="15" fill="#065f46" fontWeight="600">
          Returns + Services
        </text>

        <rect x="100" y="220" width="1000" height="380" rx="16" fill="#ffffff" stroke="#bbf7d0" strokeWidth="2" />
        <text x="600" y="255" textAnchor="middle" fontSize="16" fill="#166534" fontWeight="700">
          Market Hall Grid
        </text>

        <rect x="100" y="620" width="1000" height="50" rx="12" fill="#f0fdf4" stroke="#86efac" strokeWidth="2" />
        <text x="200" y="650" textAnchor="middle" fontSize="14" fill="#166534" fontWeight="700">
          Entrance
        </text>
        <text x="960" y="650" textAnchor="middle" fontSize="14" fill="#166534" fontWeight="700">
          Checkout Lanes
        </text>

        {Array.from({ length: 10 }).map((_, index) => (
          <line
            key={`checkout-lane-${index}`}
            x1={700 + index * 35}
            y1={626}
            x2={700 + index * 35}
            y2={664}
            stroke="#16a34a"
            strokeWidth="2"
          />
        ))}
      </g>
    );
  }

  return (
    <g>
      <rect x="70" y="90" width="1060" height="600" rx="24" fill="#fffbf2" stroke="#fcd34d" strokeWidth="3" />
      <rect x="90" y="110" width="240" height="50" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <text x="210" y="141" textAnchor="middle" fontSize="13" fill="#92400e" fontWeight="700">
        Loading Docks
      </text>

      <rect x="870" y="110" width="240" height="50" rx="10" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      <text x="990" y="141" textAnchor="middle" fontSize="13" fill="#92400e" fontWeight="700">
        Outbound Gates
      </text>

      <rect x="90" y="170" width="1020" height="460" rx="14" fill="#ffffff" stroke="#fde68a" strokeWidth="2" />
      <text x="210" y="668" textAnchor="middle" fontSize="14" fill="#92400e" fontWeight="700">
        Click & Collect
      </text>
      <text x="980" y="668" textAnchor="middle" fontSize="14" fill="#92400e" fontWeight="700">
        Forklift Corridor
      </text>

      <line x1="90" y1="300" x2="1110" y2="300" stroke="#fcd34d" strokeWidth="2" strokeDasharray="7 6" />
      <line x1="90" y1="520" x2="1110" y2="520" stroke="#fcd34d" strokeWidth="2" strokeDasharray="7 6" />
    </g>
  );
}

function connectorGlyph(connector: Connector) {
  if (connector.kind === "escalator") {
    return (
      <g>
        <rect x={connector.x - 16} y={connector.y - 11} width="32" height="22" rx="5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
        <line x1={connector.x - 9} y1={connector.y + 5} x2={connector.x + 8} y2={connector.y - 6} stroke="#1e293b" strokeWidth="1.7" />
        <line x1={connector.x - 9} y1={connector.y + 1} x2={connector.x + 8} y2={connector.y - 10} stroke="#1e293b" strokeWidth="1.7" />
      </g>
    );
  }

  if (connector.kind === "elevator") {
    return (
      <g>
        <rect x={connector.x - 15} y={connector.y - 11} width="30" height="22" rx="5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
        <path d={`M ${connector.x} ${connector.y - 7} L ${connector.x - 4} ${connector.y - 1} H ${connector.x + 4} Z`} fill="#1e293b" />
        <path d={`M ${connector.x} ${connector.y + 7} L ${connector.x - 4} ${connector.y + 1} H ${connector.x + 4} Z`} fill="#1e293b" />
      </g>
    );
  }

  return (
    <g>
      <rect x={connector.x - 16} y={connector.y - 11} width="32" height="22" rx="5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <polyline
        points={`${connector.x - 9},${connector.y + 7} ${connector.x - 3},${connector.y + 1} ${connector.x + 3},${connector.y + 7} ${connector.x + 9},${connector.y + 1}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="1.8"
      />
    </g>
  );
}

export default function MapPage() {
  const { products: productDocs, loading, error } = useProducts();
  const [searchParams] = useSearchParams();

  const requestedAisle = parseQueryNumber(searchParams.get("aisle"));
  const requestedBay = parseQueryNumber(searchParams.get("bay"));
  const requestedSection = searchParams.get("section")?.trim().toUpperCase() || null;

  const products = useMemo(() => productDocumentsToProducts(productDocs), [productDocs]);

  const locatedProducts = useMemo<LocatedProduct[]>(
    () =>
      products
        .map((product) => {
          const mapLocation = parseLocation(product);
          if (!mapLocation) return null;
          return { ...product, mapLocation };
        })
        .filter((product): product is LocatedProduct => product !== null),
    [products]
  );

  const [activeFloor, setActiveFloor] = useState<FloorId>("L0");
  const [selectedAisle, setSelectedAisle] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (bootstrapped) return;
    if (locatedProducts.length === 0) return;

    let seed: LocatedProduct | undefined;

    if (requestedAisle !== null) {
      seed = locatedProducts.find((product) => {
        if (product.mapLocation.aisle !== requestedAisle) return false;
        if (requestedBay !== null && product.mapLocation.bay !== requestedBay) return false;
        if (requestedSection && product.mapLocation.section !== requestedSection) return false;
        return true;
      });

      if (!seed && requestedBay !== null) {
        seed = locatedProducts.find(
          (product) => product.mapLocation.aisle === requestedAisle && product.mapLocation.bay === requestedBay
        );
      }

      if (!seed) {
        seed = locatedProducts.find((product) => product.mapLocation.aisle === requestedAisle);
      }
    }

    if (!seed) {
      seed = locatedProducts
        .slice()
        .sort((a, b) => {
          const tierDiff = stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity);
          if (tierDiff !== 0) return tierDiff;
          return a.name.localeCompare(b.name);
        })[0];
    }

    if (seed) {
      setSelectedProductId(seed._id);
      setActiveFloor(seed.mapLocation.floor);
      setSelectedAisle(seed.mapLocation.aisle);
    }

    setBootstrapped(true);
  }, [bootstrapped, locatedProducts, requestedAisle, requestedBay, requestedSection]);

  const selectedProduct = useMemo(
    () => locatedProducts.find((product) => product._id === selectedProductId) ?? null,
    [locatedProducts, selectedProductId]
  );

  useEffect(() => {
    if (!selectedProductId || selectedProduct) return;
    setSelectedProductId(null);
  }, [selectedProductId, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    setActiveFloor(selectedProduct.mapLocation.floor);
    setSelectedAisle(selectedProduct.mapLocation.aisle);
  }, [selectedProduct]);

  const floorCounts = useMemo(() => {
    const counts: Record<FloorId, number> = { L1: 0, L0: 0, B1: 0 };

    for (const product of locatedProducts) {
      counts[product.mapLocation.floor] += 1;
    }

    return counts;
  }, [locatedProducts]);

  const aisleStatsByFloor = useMemo(() => {
    const byFloor = new Map<FloorId, Map<number, { total: number; low: number; out: number }>>();

    for (const floor of FLOOR_ORDER) {
      byFloor.set(floor, new Map());
    }

    for (const product of locatedProducts) {
      const floorMap = byFloor.get(product.mapLocation.floor)!;
      const key = product.mapLocation.aisle;
      const existing = floorMap.get(key) ?? { total: 0, low: 0, out: 0 };
      existing.total += 1;
      if (product.stock.quantity <= 0) existing.out += 1;
      if (product.stock.quantity > 0 && product.stock.quantity <= LOW_STOCK_THRESHOLD) existing.low += 1;
      floorMap.set(key, existing);
    }

    return byFloor;
  }, [locatedProducts]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matching = q
      ? locatedProducts.filter((product) => {
          const tags = product.tags?.join(" ").toLowerCase() ?? "";
          return (
            product.name.toLowerCase().includes(q) ||
            product.articleNumber.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q) ||
            tags.includes(q)
          );
        })
      : locatedProducts.slice();

    return matching
      .sort((a, b) => {
        const scoreDiff = queryScore(b, q) - queryScore(a, q);
        if (scoreDiff !== 0) return scoreDiff;
        const riskDiff = stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity);
        if (riskDiff !== 0) return riskDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, q ? 25 : 16);
  }, [locatedProducts, query]);

  const floorProducts = useMemo(
    () => locatedProducts.filter((product) => product.mapLocation.floor === activeFloor),
    [locatedProducts, activeFloor]
  );

  useEffect(() => {
    if (selectedAisle !== null) return;

    const firstWithInventory = floorProducts[0]?.mapLocation.aisle;
    if (firstWithInventory !== undefined) {
      setSelectedAisle(firstWithInventory);
      return;
    }

    setSelectedAisle(floorAisles[activeFloor][0]?.aisle ?? null);
  }, [activeFloor, floorProducts, selectedAisle]);

  const selectedAisleProducts = useMemo(() => {
    if (selectedAisle === null) return [];

    return floorProducts
      .filter((product) => product.mapLocation.aisle === selectedAisle)
      .slice()
      .sort((a, b) => {
        const stockDiff = a.stock.quantity - b.stock.quantity;
        if (stockDiff !== 0) return stockDiff;
        return a.name.localeCompare(b.name);
      });
  }, [floorProducts, selectedAisle]);

  const markerPoints = useMemo<MarkerPoint[]>(() => {
    const grouped = new Map<string, LocatedProduct[]>();

    for (const product of floorProducts) {
      const key = `${product.mapLocation.aisle}:${product.mapLocation.bay}`;
      const list = grouped.get(key) ?? [];
      list.push(product);
      grouped.set(key, list);
    }

    const offsets: Point[] = [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: -8, y: 0 },
      { x: 0, y: 8 },
      { x: 0, y: -8 },
      { x: 6, y: 6 },
      { x: -6, y: 6 },
      { x: 6, y: -6 },
      { x: -6, y: -6 },
    ];

    const markers: MarkerPoint[] = [];

    for (const list of grouped.values()) {
      const baseProduct = list[0];
      const geometry = getAisleGeometry(activeFloor, baseProduct.mapLocation.aisle);
      const base = getMarkerPoint(geometry, baseProduct.mapLocation.bay);

      list
        .slice()
        .sort((a, b) => stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity))
        .forEach((product, index) => {
          const offset = offsets[index % offsets.length];
          markers.push({
            product,
            x: base.x + offset.x,
            y: base.y + offset.y,
            tier: stockTier(product.stock.quantity),
          });
        });
    }

    return markers;
  }, [activeFloor, floorProducts]);

  const selectedTargetPoint = useMemo(() => {
    if (!selectedProduct) return null;
    const geometry = getAisleGeometry(selectedProduct.mapLocation.floor, selectedProduct.mapLocation.aisle);
    return getMarkerPoint(geometry, selectedProduct.mapLocation.bay);
  }, [selectedProduct]);

  const activeConnector = useMemo(() => {
    if (!selectedProduct || !selectedTargetPoint) return null;
    if (selectedProduct.mapLocation.floor === "L0") return null;

    return connectors.reduce((best, connector) => {
      if (!best) return connector;
      const bestDistance = Math.abs(best.x - selectedTargetPoint.x);
      const candidateDistance = Math.abs(connector.x - selectedTargetPoint.x);
      return candidateDistance < bestDistance ? connector : best;
    }, null as Connector | null);
  }, [selectedProduct, selectedTargetPoint]);

  const routeSteps = useMemo(() => {
    if (!selectedProduct) return [] as string[];

    const floorInfo = floorMeta[selectedProduct.mapLocation.floor];

    if (!activeConnector || selectedProduct.mapLocation.floor === "L0") {
      return [
        "Enter from Ground Level entrance",
        `Walk to aisle ${selectedProduct.mapLocation.aisle}`,
        `Stop at bay ${selectedProduct.mapLocation.bay}, section ${selectedProduct.mapLocation.section}`,
      ];
    }

    return [
      "Enter from Ground Level entrance",
      `Take ${activeConnector.label} to ${floorInfo.label}`,
      `Walk to aisle ${selectedProduct.mapLocation.aisle}`,
      `Pick from bay ${selectedProduct.mapLocation.bay}, section ${selectedProduct.mapLocation.section}`,
    ];
  }, [selectedProduct, activeConnector]);

  const activeFloorPath = useMemo(() => {
    if (!selectedProduct || !selectedTargetPoint) return null;

    if (selectedProduct.mapLocation.floor === "L0") {
      if (activeFloor !== "L0") return null;

      return compactPath([
        floorMeta.L0.entry,
        { x: floorMeta.L0.entry.x, y: selectedTargetPoint.y },
        selectedTargetPoint,
      ]);
    }

    if (!activeConnector) return null;

    if (activeFloor === "L0") {
      return compactPath([
        floorMeta.L0.entry,
        { x: floorMeta.L0.entry.x, y: activeConnector.y },
        { x: activeConnector.x, y: activeConnector.y },
      ]);
    }

    if (activeFloor === selectedProduct.mapLocation.floor) {
      return compactPath([
        { x: activeConnector.x, y: activeConnector.y },
        { x: activeConnector.x, y: selectedTargetPoint.y },
        selectedTargetPoint,
      ]);
    }

    return null;
  }, [selectedProduct, selectedTargetPoint, activeFloor, activeConnector]);

  const routePolyline = activeFloorPath ? toPolyline(activeFloorPath) : null;

  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;

    for (const product of locatedProducts) {
      const tier = stockTier(product.stock.quantity);
      if (tier === "out") outOfStock += 1;
      if (tier === "low") lowStock += 1;
    }

    return {
      products: locatedProducts.length,
      aisles: new Set(locatedProducts.map((product) => `${product.mapLocation.floor}:${product.mapLocation.aisle}`)).size,
      lowStock,
      outOfStock,
    };
  }, [locatedProducts]);

  const floorTitle = floorMeta[activeFloor];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)]">
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4 pb-24">
        <section className="overflow-hidden rounded-md border-2 border-[#0058A3] bg-[#0058A3] text-white shadow-[0_8px_0_0_rgba(0,88,163,0.2)]">
          <div className="h-2 bg-[#FFDB00]" />
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/80">Multi-Floor Floorplan</p>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">IKEA Warehouse Navigation Map</h1>
                <p className="text-sm text-white/90 mt-1 max-w-2xl">
                Three real floorplates, vertical connectors, and aisle-level routing from entrance to exact bay.
                </p>
              </div>
              <Link to="/scan">
                <Button variant="secondary" className="rounded-sm border border-[#0058A3] bg-white text-[#0058A3] hover:bg-[#f6f9fc]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Scan
                </Button>
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#0a3f75]">
              <div className="rounded-sm border border-[#0058A3]/20 bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Products</p>
                <p className="text-xl font-black">{stats.products}</p>
              </div>
              <div className="rounded-sm border border-[#0058A3]/20 bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Aisles</p>
                <p className="text-xl font-black">{stats.aisles}</p>
              </div>
              <div className="rounded-sm border border-[#0058A3]/20 bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Low Stock</p>
                <p className="text-xl font-black text-amber-700">{stats.lowStock}</p>
              </div>
              <div className="rounded-sm border border-[#0058A3]/20 bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Out Of Stock</p>
                <p className="text-xl font-black text-red-700">{stats.outOfStock}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="min-h-0 border-2 border-[#b7c7da] bg-white shadow-sm order-2 xl:order-2">
            <CardHeader className="pb-2 border-b border-[#e2e8f0]">
              <CardTitle className="text-base font-bold uppercase tracking-wide text-[#0b3e75]">Product Navigator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find product by name, article, category"
                  className="pl-9 pr-9 border-[#bfd0e2] focus-visible:ring-[#0058A3]/30"
                />
                {query && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {loading && <p className="text-sm text-muted-foreground">Loading mapped products...</p>}

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No products match this query.</p>
              )}

              <div className="max-h-[68vh] overflow-y-auto space-y-2 pr-1">
                {searchResults.map((product) => {
                  const Icon = zoneMeta[product.mapLocation.zone].icon;
                  const isSelected = selectedProductId === product._id;

                  return (
                    <button
                      key={product._id}
                      onClick={() => {
                        setSelectedProductId(product._id);
                        setActiveFloor(product.mapLocation.floor);
                        setSelectedAisle(product.mapLocation.aisle);
                      }}
                      className={cn(
                        "w-full rounded-sm border border-[#d7e1ec] p-3 text-left transition-colors hover:border-[#0058A3]/40 hover:bg-[#f7fbff]",
                        isSelected && "border-[#0058A3] bg-[#e9f3ff]"
                      )}
                    >
                      <p className="font-semibold leading-tight">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{product.articleNumber}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                          <Icon className="h-3 w-3 mr-1" />
                          {floorMeta[product.mapLocation.floor].label}
                        </Badge>
                        <Badge variant="outline">
                          A{product.mapLocation.aisle} / B{product.mapLocation.bay}
                        </Badge>
                        <Badge variant={stockBadgeVariant(product.stock.quantity)}>
                          {product.stock.quantity} units
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 order-1 xl:order-1">
            <Card className="border-2 border-[#b7c7da] bg-white shadow-sm">
              <CardHeader className="pb-2 border-b border-[#e2e8f0]">
                <CardTitle className="text-base font-bold uppercase tracking-wide text-[#0b3e75]">Floor Selector</CardTitle>
                <p className="text-xs text-muted-foreground">Switch floors to inspect geometry, aisles, and vertical connectors.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {FLOOR_ORDER.map((floor) => {
                    const meta = floorMeta[floor];
                    const active = floor === activeFloor;
                    const Icon = zoneMeta[meta.zone].icon;
                    return (
                      <button
                        key={floor}
                        onClick={() => {
                          setActiveFloor(floor);
                          setSelectedAisle(null);
                        }}
                        className={cn(
                          "rounded-sm border p-3 text-left transition-colors",
                          active
                            ? "border-[#0058A3] bg-[#e9f3ff] ring-2 ring-[#FFDB00]"
                            : "border-[#c9d5e3] bg-white hover:border-[#0058A3]/40 hover:bg-[#f7fbff]"
                        )}
                      >
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                        <p className="font-semibold leading-tight mt-1">{meta.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{meta.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <Badge variant="outline">
                            <Icon className="h-3 w-3 mr-1" />
                            {zoneMeta[meta.zone].label}
                          </Badge>
                          <Badge variant="secondary">{floorCounts[floor]} products</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-x-auto rounded-sm border-2 border-[#0058A3] bg-white p-2">
                  <div className="mb-2 flex items-center justify-between rounded-sm bg-[#0058A3] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                    <span>{floorTitle.label} Floorplate</span>
                    <span className="text-[#FFDB00]">{floorTitle.title}</span>
                  </div>
                  <svg viewBox="0 0 1200 780" className="h-[560px] min-w-[980px] w-full" role="img" aria-label={`${floorTitle.label} map`}>
                    <rect x="0" y="0" width="1200" height="780" fill="#eef4fa" />
                    {renderFloorScenery(activeFloor)}

                    {floorAisles[activeFloor].map((aisle) => {
                      const stat = aisleStatsByFloor.get(activeFloor)?.get(aisle.aisle);
                      const isSelected = selectedAisle === aisle.aisle;

                      let fill = "#e5e7eb";
                      let stroke = "#94a3b8";
                      let textColor = "#334155";

                      if (stat?.out) {
                        fill = "#fee2e2";
                        stroke = "#f87171";
                        textColor = "#7f1d1d";
                      } else if (stat?.low) {
                        fill = "#fef3c7";
                        stroke = "#f59e0b";
                        textColor = "#78350f";
                      } else if (stat && stat.total > 0) {
                        fill = "#dcfce7";
                        stroke = "#4ade80";
                        textColor = "#14532d";
                      }

                      if (isSelected) {
                        fill = "#dbeafe";
                        stroke = "#2563eb";
                        textColor = "#1e3a8a";
                      }

                      return (
                        <g
                          key={`aisle-${activeFloor}-${aisle.aisle}`}
                          onClick={() => {
                            setSelectedAisle(aisle.aisle);
                            const inAisle = floorProducts
                              .filter((product) => product.mapLocation.aisle === aisle.aisle)
                              .sort((a, b) => stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity));
                            if (inAisle[0]) {
                              setSelectedProductId(inAisle[0]._id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <rect
                            x={aisle.x}
                            y={aisle.y}
                            width={aisle.width}
                            height={aisle.height}
                            rx="7"
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={isSelected ? "3" : "1.8"}
                          />

                          {aisle.orientation === "vertical" ? (
                            <>
                              <text
                                x={aisle.x + aisle.width / 2}
                                y={aisle.y - 7}
                                textAnchor="middle"
                                fontSize="9"
                                fill={textColor}
                                fontWeight="700"
                              >
                                {aisle.aisle}
                              </text>
                            </>
                          ) : (
                            <text
                              x={aisle.x + aisle.width / 2}
                              y={aisle.y + aisle.height / 2 + 4}
                              textAnchor="middle"
                              fontSize="12"
                              fill={textColor}
                              fontWeight="700"
                            >
                              A{aisle.aisle}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {connectors.map((connector) => (
                      <g key={`connector-${connector.id}`}>
                        {connectorGlyph(connector)}
                        <text x={connector.x} y={connector.y + 21} textAnchor="middle" fontSize="9" fill="#0f172a" fontWeight="600">
                          {connectorSymbol(connector.kind)}
                        </text>
                      </g>
                    ))}

                    {routePolyline && (
                      <g>
                        <polyline
                          points={routePolyline}
                          fill="none"
                          stroke="#0058A3"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="12 8"
                        />
                        {activeFloorPath?.[0] && (
                          <circle cx={activeFloorPath[0].x} cy={activeFloorPath[0].y} r="8" fill="#0ea5e9" stroke="#ffffff" strokeWidth="3" />
                        )}
                        {activeFloorPath?.[activeFloorPath.length - 1] && (
                          <circle
                            cx={activeFloorPath[activeFloorPath.length - 1].x}
                            cy={activeFloorPath[activeFloorPath.length - 1].y}
                            r="8"
                            fill="#1d4ed8"
                            stroke="#ffffff"
                            strokeWidth="3"
                          />
                        )}
                      </g>
                    )}

                    {markerPoints.map((marker) => {
                      const isSelected = selectedProductId === marker.product._id;
                      const fill = marker.tier === "out" ? "#dc2626" : marker.tier === "low" ? "#d97706" : "#15803d";

                      return (
                        <g
                          key={`marker-${marker.product._id}`}
                          onClick={() => {
                            setSelectedProductId(marker.product._id);
                            setSelectedAisle(marker.product.mapLocation.aisle);
                          }}
                          className="cursor-pointer"
                        >
                          {isSelected && <circle cx={marker.x} cy={marker.y} r="12" fill="#bfdbfe" opacity="0.8" />}
                          <circle cx={marker.x} cy={marker.y} r={isSelected ? 7 : 5.5} fill={fill} stroke="#ffffff" strokeWidth="2" />
                          <title>
                            {`${marker.product.name} - Aisle ${marker.product.mapLocation.aisle}, Bay ${marker.product.mapLocation.bay}`}
                          </title>
                        </g>
                      );
                    })}

                    <text x="90" y="72" fontSize="20" fill="#0f172a" fontWeight="800">
                      {floorTitle.label} - {floorTitle.title}
                    </text>
                  </svg>
                </div>

                <div className="rounded-sm border border-[#c5d3e3] bg-[#f9fbfe] p-3 text-xs space-y-2">
                  <p className="font-semibold text-sm uppercase tracking-wide text-[#0b3e75]">Map Key</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#dc2626]" />Out (0)</span>
                    <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#d97706]" />Low (1-10)</span>
                    <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#15803d]" />Healthy (11+)</span>
                    <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#1d4ed8]" />Selected</span>
                    <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#ffffff] border border-slate-500" />Vertical connector</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="border-2 border-[#b7c7da] bg-white shadow-sm">
                <CardHeader className="pb-2 border-b border-[#e2e8f0]">
                  <CardTitle className="text-base font-bold uppercase tracking-wide text-[#0b3e75]">Route Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedProduct ? (
                    <>
                      <div className="rounded-sm border border-[#0058A3]/30 bg-[#e9f3ff] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0058A3]">Focused Product</p>
                        <p className="text-sm font-semibold mt-1">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProduct.articleNumber}</p>
                        <p className="text-xs mt-1 inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {floorMeta[selectedProduct.mapLocation.floor].label}, aisle {selectedProduct.mapLocation.aisle}, bay {selectedProduct.mapLocation.bay}, section {selectedProduct.mapLocation.section}
                        </p>
                        <p className="text-xs mt-2 font-medium" style={{ color: stockColor(selectedProduct.stock.quantity) }}>
                          Stock: {selectedProduct.stock.quantity}
                        </p>
                      </div>

                      <ol className="space-y-2 text-sm">
                        {routeSteps.map((step, index) => (
                          <li key={step} className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0058A3] text-[11px] font-semibold text-white ring-2 ring-[#FFDB00]">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {activeConnector && selectedProduct.mapLocation.floor !== "L0" && (
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Navigation className="h-3.5 w-3.5" />
                          Vertical transfer uses {activeConnector.label}.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a product to generate a route.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-[#b7c7da] bg-white shadow-sm">
                <CardHeader className="pb-2 border-b border-[#e2e8f0]">
                  <CardTitle className="text-base font-bold uppercase tracking-wide text-[#0b3e75]">Aisle Inventory ({selectedAisle ?? "-"})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedAisleProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No mapped products in this aisle on {floorTitle.label}.</p>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                      {selectedAisleProducts.map((product) => (
                        <button
                          key={`aisle-product-${product._id}`}
                          onClick={() => setSelectedProductId(product._id)}
                          className={cn(
                            "w-full rounded-sm border border-[#d7e1ec] p-3 text-left transition-colors hover:border-[#0058A3]/40 hover:bg-[#f7fbff]",
                            selectedProductId === product._id && "border-[#0058A3] bg-[#e9f3ff]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-tight">{product.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{product.articleNumber}</p>
                            </div>
                            <Badge variant={stockBadgeVariant(product.stock.quantity)}>{product.stock.quantity}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Bay {product.mapLocation.bay}, section {product.mapLocation.section}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
