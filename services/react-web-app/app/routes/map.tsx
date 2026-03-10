import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Crosshair,
  Move,
  Pause,
  Play,
  MapPin,
  Navigation,
  PersonStanding,
  Route,
  Search,
  StepForward,
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

interface SimPosition {
  floor: FloorId;
  point: Point;
}

interface RouteSegment {
  floor: FloorId;
  points: Point[];
}

interface RoutePlan {
  segments: RouteSegment[];
  steps: string[];
  transferConnector: Connector | null;
  destinationPoint: Point;
}

const LOW_STOCK_THRESHOLD = 10;
const FLOOR_ORDER: FloorId[] = ["L1", "L0", "B1"];
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 780;
const GRID_SIZE = 20;
const GRID_COLS = Math.ceil(MAP_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.ceil(MAP_HEIGHT / GRID_SIZE);
const AISLE_BLOCK_PADDING = 2;
const AISLE_BLOCK_SHRINK = 4;
const STACKED_SCALE = 0.9;
const STACKED_X = 60;
const STACKED_Y_START = 30;
const STACKED_Y_STEP = 740;
const STACKED_VIEWBOX_HEIGHT = 2320;

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
    title: "Showroom",
    description: "Inspirational room sets with wider walkways",
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
    [1, 110, 170, 150, 70, "Living"],
    [2, 310, 170, 150, 70, "Living"],
    [3, 510, 170, 150, 70, "Living"],
    [4, 710, 170, 150, 70, "Bedroom"],
    [5, 910, 170, 150, 70, "Bedroom"],
    [6, 110, 300, 150, 70, "Bedroom"],
    [7, 310, 300, 150, 70, "Kitchen"],
    [8, 510, 300, 150, 70, "Kitchen"],
    [9, 710, 300, 150, 70, "Kitchen"],
    [10, 910, 300, 150, 70, "Workspace"],
    [11, 110, 430, 150, 70, "Workspace"],
    [12, 310, 430, 150, 70, "Workspace"],
    [13, 510, 430, 150, 70, "Kids"],
    [14, 710, 430, 150, 70, "Textiles"],
    [15, 910, 430, 150, 70, "Planning"],
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

function productEmoji(product: LocatedProduct): string {
  const category = product.category.toLowerCase();
  const tags = (product.tags ?? []).join(" ").toLowerCase();
  const name = product.name.toLowerCase();
  const haystack = `${category} ${tags} ${name}`;

  if (haystack.includes("kitchen") || haystack.includes("cook")) return "🍳";
  if (haystack.includes("bed") || haystack.includes("sleep") || haystack.includes("mattress")) return "🛏️";
  if (haystack.includes("light") || haystack.includes("lamp")) return "💡";
  if (haystack.includes("chair") || haystack.includes("sofa") || haystack.includes("seat")) return "🪑";
  if (haystack.includes("table") || haystack.includes("desk")) return "🛋️";
  if (haystack.includes("textile") || haystack.includes("fabric") || haystack.includes("curtain")) return "🧵";
  if (haystack.includes("kids") || haystack.includes("child") || haystack.includes("toy")) return "🧸";
  if (haystack.includes("plant")) return "🪴";
  if (haystack.includes("bath")) return "🧴";
  return "📦";
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

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clampPointToAisle(aisle: AisleGeometry, point: Point, inset = 3): Point {
  return {
    x: Math.max(aisle.x + inset, Math.min(aisle.x + aisle.width - inset, point.x)),
    y: Math.max(aisle.y + inset, Math.min(aisle.y + aisle.height - inset, point.y)),
  };
}

function markerOffsetsForAisle(aisle: AisleGeometry): Point[] {
  if (aisle.orientation === "vertical") {
    return [
      { x: 0, y: 0 },
      { x: -3, y: 0 },
      { x: 3, y: 0 },
      { x: -4, y: 5 },
      { x: 4, y: -5 },
      { x: 0, y: 7 },
      { x: 0, y: -7 },
      { x: -2, y: 10 },
      { x: 2, y: -10 },
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: 0, y: -8 },
    { x: 0, y: 8 },
    { x: 7, y: -5 },
    { x: -7, y: 5 },
    { x: 10, y: 0 },
    { x: -10, y: 0 },
    { x: 0, y: -13 },
    { x: 0, y: 13 },
  ];
}

function getPlacedMarkerPoint(aisle: AisleGeometry, base: Point, index: number, productId: string): Point {
  const offsets = markerOffsetsForAisle(aisle);
  const offset = offsets[index % offsets.length];
  const alongJitter = ((hashString(productId) % 9) - 4) * 0.8;

  const raw: Point =
    aisle.orientation === "vertical"
      ? { x: base.x + offset.x, y: base.y + offset.y + alongJitter }
      : { x: base.x + offset.x + alongJitter, y: base.y + offset.y };

  return clampPointToAisle(aisle, raw);
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

interface GridCell {
  col: number;
  row: number;
}

function cellIndex(cell: GridCell): number {
  return cell.row * GRID_COLS + cell.col;
}

function pointToCell(point: Point): GridCell {
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(point.x / GRID_SIZE))),
    row: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(point.y / GRID_SIZE))),
  };
}

function cellToPoint(cell: GridCell): Point {
  return {
    x: cell.col * GRID_SIZE + GRID_SIZE / 2,
    y: cell.row * GRID_SIZE + GRID_SIZE / 2,
  };
}

function inBounds(cell: GridCell): boolean {
  return cell.col >= 0 && cell.col < GRID_COLS && cell.row >= 0 && cell.row < GRID_ROWS;
}

function manhattanCell(a: GridCell, b: GridCell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function isBlockedCell(floor: FloorId, cell: GridCell): boolean {
  const center = cellToPoint(cell);
  return floorAisles[floor].some((aisle) => {
    const shrinkX = Math.min(AISLE_BLOCK_SHRINK, aisle.width / 3);
    const shrinkY = Math.min(AISLE_BLOCK_SHRINK, aisle.height / 3);
    const minX = aisle.x + shrinkX - AISLE_BLOCK_PADDING;
    const maxX = aisle.x + aisle.width - shrinkX + AISLE_BLOCK_PADDING;
    const minY = aisle.y + shrinkY - AISLE_BLOCK_PADDING;
    const maxY = aisle.y + aisle.height - shrinkY + AISLE_BLOCK_PADDING;
    return center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY;
  });
}

function nearestWalkableCell(floor: FloorId, origin: GridCell): GridCell | null {
  if (inBounds(origin) && !isBlockedCell(floor, origin)) return origin;

  const queue: GridCell[] = [origin];
  const visited = new Set<number>([cellIndex(origin)]);
  const dirs = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dir of dirs) {
      const next = { col: cur.col + dir.col, row: cur.row + dir.row };
      if (!inBounds(next)) continue;
      const index = cellIndex(next);
      if (visited.has(index)) continue;
      if (!isBlockedCell(floor, next)) return next;
      visited.add(index);
      queue.push(next);
    }
  }

  return null;
}

function reconstructCellPath(cameFrom: Map<number, number>, end: GridCell): GridCell[] {
  const path: GridCell[] = [end];
  let current = cellIndex(end);

  while (cameFrom.has(current)) {
    const parent = cameFrom.get(current)!;
    path.unshift({ col: parent % GRID_COLS, row: Math.floor(parent / GRID_COLS) });
    current = parent;
  }

  return path;
}

function aStarGrid(floor: FloorId, from: Point, to: Point): Point[] | null {
  const startCell = nearestWalkableCell(floor, pointToCell(from));
  const endCell = nearestWalkableCell(floor, pointToCell(to));
  if (!startCell || !endCell) return null;

  const startKey = cellIndex(startCell);
  const endKey = cellIndex(endCell);

  const open: number[] = [startKey];
  const openSet = new Set<number>([startKey]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[startKey, 0]]);
  const fScore = new Map<number, number>([[startKey, manhattanCell(startCell, endCell)]]);

  const dirs = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ];

  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if ((fScore.get(open[i]) ?? Infinity) < (fScore.get(open[bestIndex]) ?? Infinity)) {
        bestIndex = i;
      }
    }

    const current = open[bestIndex];
    open.splice(bestIndex, 1);
    openSet.delete(current);

    if (current === endKey) {
      const cellPath = reconstructCellPath(cameFrom, endCell);
      return compactPath(cellPath.map(cellToPoint));
    }

    const curCell = { col: current % GRID_COLS, row: Math.floor(current / GRID_COLS) };

    for (const dir of dirs) {
      const nextCell = { col: curCell.col + dir.col, row: curCell.row + dir.row };
      if (!inBounds(nextCell)) continue;
      if (isBlockedCell(floor, nextCell)) continue;

      const nextKey = cellIndex(nextCell);
      const tentative = (gScore.get(current) ?? Infinity) + 1;
      if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;

      cameFrom.set(nextKey, current);
      gScore.set(nextKey, tentative);
      fScore.set(nextKey, tentative + manhattanCell(nextCell, endCell));

      if (!openSet.has(nextKey)) {
        open.push(nextKey);
        openSet.add(nextKey);
      }
    }
  }

  return null;
}

function simplifyPath(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const simplified: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1];
    const cur = points[i];
    const next = points[i + 1];
    const collinear =
      (prev.x === cur.x && cur.x === next.x) ||
      (prev.y === cur.y && cur.y === next.y);
    if (!collinear) {
      simplified.push(cur);
    }
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

function pathOnFloor(floor: FloorId, from: Point, to: Point): Point[] | null {
  const path = aStarGrid(floor, from, to);
  if (!path) return null;
  return simplifyPath(path);
}

function distanceToAisleRect(point: Point, aisle: AisleGeometry): number {
  const minX = aisle.x;
  const maxX = aisle.x + aisle.width;
  const minY = aisle.y;
  const maxY = aisle.y + aisle.height;
  const dx = Math.max(minX - point.x, 0, point.x - maxX);
  const dy = Math.max(minY - point.y, 0, point.y - maxY);
  return Math.hypot(dx, dy);
}

function getAislePickupCandidates(aisle: AisleGeometry, bay: number): Point[] {
  const ratio = bayRatio(bay);
  const aisleMidX = aisle.x + aisle.width / 2;
  const aisleMidY = aisle.y + aisle.height / 2;
  const walkwayOffset = AISLE_BLOCK_PADDING + GRID_SIZE * 0.75;

  if (aisle.orientation === "vertical") {
    const y = aisle.y + 12 + ratio * (aisle.height - 24);
    return [
      { x: aisle.x - walkwayOffset, y },
      { x: aisle.x + aisle.width + walkwayOffset, y },
      { x: aisleMidX, y: aisle.y - walkwayOffset },
      { x: aisleMidX, y: aisle.y + aisle.height + walkwayOffset },
    ];
  }

  const x = aisle.x + 12 + ratio * (aisle.width - 24);
  return [
    { x, y: aisle.y - walkwayOffset },
    { x, y: aisle.y + aisle.height + walkwayOffset },
    { x: aisle.x - walkwayOffset, y: aisleMidY },
    { x: aisle.x + aisle.width + walkwayOffset, y: aisleMidY },
  ];
}

function estimateDistance(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function renderFloorScenery(floor: FloorId) {
  if (floor === "L1") {
    const rooms = [
      { x: 100, y: 104, w: 300, h: 88, label: "Living Worlds" },
      { x: 420, y: 104, w: 300, h: 88, label: "Bedrooms" },
      { x: 740, y: 104, w: 300, h: 88, label: "Kitchen Studio" },
      { x: 100, y: 540, w: 300, h: 90, label: "Kids" },
      { x: 420, y: 540, w: 300, h: 90, label: "Textiles" },
      { x: 740, y: 540, w: 300, h: 90, label: "Planning Studio" },
    ];

    return (
      <g>
        <rect x="70" y="90" width="1060" height="600" rx="24" fill="#f8fbff" stroke="#93c5fd" strokeWidth="3" />
        <rect x="90" y="150" width="1020" height="390" rx="18" fill="#ffffff" stroke="#dbeafe" strokeWidth="2" />
        <line x1="90" y1="270" x2="1110" y2="270" stroke="#bfdbfe" strokeWidth="16" />
        <line x1="90" y1="400" x2="1110" y2="400" stroke="#bfdbfe" strokeWidth="16" />
        <line x1="285" y1="150" x2="285" y2="540" stroke="#dbeafe" strokeWidth="14" />
        <line x1="485" y1="150" x2="485" y2="540" stroke="#dbeafe" strokeWidth="14" />
        <line x1="685" y1="150" x2="685" y2="540" stroke="#dbeafe" strokeWidth="14" />
        <line x1="885" y1="150" x2="885" y2="540" stroke="#dbeafe" strokeWidth="14" />
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
  const [simPosition, setSimPosition] = useState<SimPosition>({
    floor: "L0",
    point: floorMeta.L0.entry,
  });
  const [tapToMove, setTapToMove] = useState(false);
  const [dragToMove, setDragToMove] = useState(true);
  const [autoMove, setAutoMove] = useState(false);
  const [stackedView, setStackedView] = useState(true);
  const [transferMode, setTransferMode] = useState<"any" | Connector["kind"]>("any");
  const [isDraggingMe, setIsDraggingMe] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const selectedProductRef = useRef<LocatedProduct | null>(null);
  const selectedTargetPointRef = useRef<Point | null>(null);
  const routePlanRef = useRef<RoutePlan | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const dragFloorRef = useRef<FloorId | null>(null);

  const snapToWalkable = useCallback((floor: FloorId, point: Point): Point => {
    const clamped = {
      x: Math.max(0, Math.min(MAP_WIDTH, point.x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, point.y)),
    };
    const cell = pointToCell(clamped);
    if (!isBlockedCell(floor, cell)) return clamped;
    const nearest = nearestWalkableCell(floor, cell);
    return nearest ? cellToPoint(nearest) : clamped;
  }, []);

  const clientToSvgPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    const maxY = stackedView ? STACKED_VIEWBOX_HEIGHT : MAP_HEIGHT;
    return {
      x: Math.max(0, Math.min(MAP_WIDTH, transformed.x)),
      y: Math.max(0, Math.min(maxY, transformed.y)),
    };
  }, [stackedView]);

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

  const hasNoMappedProducts = !loading && !error && locatedProducts.length === 0;

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

    const markers: MarkerPoint[] = [];

    for (const list of grouped.values()) {
      const baseProduct = list[0];
      const geometry = getAisleGeometry(activeFloor, baseProduct.mapLocation.aisle);
      const base = getMarkerPoint(geometry, baseProduct.mapLocation.bay);

      list
        .slice()
        .sort((a, b) => stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity))
        .forEach((product, index) => {
          const placed = getPlacedMarkerPoint(geometry, base, index, product._id);
          markers.push({
            product,
            x: placed.x,
            y: placed.y,
            tier: stockTier(product.stock.quantity),
          });
        });
    }

    return markers;
  }, [activeFloor, floorProducts]);

  const markerPointsByFloor = useMemo(() => {
    const byFloor = new Map<FloorId, MarkerPoint[]>();
    for (const floor of FLOOR_ORDER) {
      const floorItems = locatedProducts.filter((product) => product.mapLocation.floor === floor);
      const grouped = new Map<string, LocatedProduct[]>();

      for (const product of floorItems) {
        const key = `${product.mapLocation.aisle}:${product.mapLocation.bay}`;
        const list = grouped.get(key) ?? [];
        list.push(product);
        grouped.set(key, list);
      }

      const markers: MarkerPoint[] = [];
      for (const list of grouped.values()) {
        const baseProduct = list[0];
        const geometry = getAisleGeometry(floor, baseProduct.mapLocation.aisle);
        const base = getMarkerPoint(geometry, baseProduct.mapLocation.bay);
        list
          .slice()
          .sort((a, b) => stockTierRank(a.stock.quantity) - stockTierRank(b.stock.quantity))
          .forEach((product, index) => {
            const placed = getPlacedMarkerPoint(geometry, base, index, product._id);
            markers.push({
              product,
              x: placed.x,
              y: placed.y,
              tier: stockTier(product.stock.quantity),
            });
          });
      }
      byFloor.set(floor, markers);
    }
    return byFloor;
  }, [locatedProducts]);

  const selectedTargetPoint = useMemo(() => {
    if (!selectedProduct) return null;
    const geometry = getAisleGeometry(selectedProduct.mapLocation.floor, selectedProduct.mapLocation.aisle);
    return getMarkerPoint(geometry, selectedProduct.mapLocation.bay);
  }, [selectedProduct]);

  const routeOriginCell = useMemo(() => pointToCell(simPosition.point), [simPosition.point.x, simPosition.point.y]);
  const routeOriginKey = `${simPosition.floor}:${routeOriginCell.col}:${routeOriginCell.row}`;

  const routePlan = useMemo<RoutePlan | null>(() => {
    if (!selectedProduct || !selectedTargetPoint) return null;

    const fromFloor = simPosition.floor;
    const toFloor = selectedProduct.mapLocation.floor;
    const fromPoint = cellToPoint(routeOriginCell);
    const destinationAisle = getAisleGeometry(toFloor, selectedProduct.mapLocation.aisle);
    const pickupCandidates = getAislePickupCandidates(destinationAisle, selectedProduct.mapLocation.bay);
    const clampedCandidates = pickupCandidates.map((candidate) => snapToWalkable(toFloor, candidate));
    if (clampedCandidates.length === 0) return null;

    if (fromFloor === toFloor) {
      let bestSameFloor: { path: Point[]; target: Point; distance: number } | null = null;
      for (const candidate of clampedCandidates) {
        const path = pathOnFloor(fromFloor, fromPoint, candidate);
        if (!path) continue;
        const distance = estimateDistance(path);
        if (!bestSameFloor || distance < bestSameFloor.distance) {
          bestSameFloor = { path, target: candidate, distance };
        }
      }
      if (!bestSameFloor) return null;
      return {
        segments: [{ floor: fromFloor, points: bestSameFloor.path }],
        steps: [
          `From your position on ${floorMeta[fromFloor].label}, continue to aisle ${selectedProduct.mapLocation.aisle}.`,
          `Stop at bay ${selectedProduct.mapLocation.bay}, section ${selectedProduct.mapLocation.section}.`,
        ],
        transferConnector: null,
        destinationPoint: bestSameFloor.target,
      };
    }

    const connectorCandidates =
      transferMode === "any" ? connectors : connectors.filter((connector) => connector.kind === transferMode);

    let best: { connector: Connector; fromPath: Point[]; toPath: Point[]; distance: number; target: Point } | null = null;
    for (const connector of connectorCandidates) {
      const fromPath = pathOnFloor(fromFloor, fromPoint, connector);
      if (!fromPath) continue;
      for (const candidate of clampedCandidates) {
        const toPath = pathOnFloor(toFloor, connector, candidate);
        if (!toPath) continue;
        const distance = estimateDistance(fromPath) + estimateDistance(toPath);
        if (!best || distance < best.distance) {
          best = { connector, fromPath, toPath, distance, target: candidate };
        }
      }
    }
    if (!best) return null;

    return {
      segments: [
        { floor: fromFloor, points: best.fromPath },
        { floor: toFloor, points: best.toPath },
      ],
      steps: [
        `Move from ${floorMeta[fromFloor].label} to ${best.connector.label}.`,
        `Transfer to ${floorMeta[toFloor].label}.`,
        `Proceed to aisle ${selectedProduct.mapLocation.aisle}, bay ${selectedProduct.mapLocation.bay}, section ${selectedProduct.mapLocation.section}.`,
      ],
      transferConnector: best.connector,
      destinationPoint: best.target,
    };
  }, [selectedProduct, selectedTargetPoint, simPosition.floor, routeOriginKey, routeOriginCell, snapToWalkable, transferMode]);

  const activeFloorPath = useMemo(() => {
    if (!routePlan) return null;
    return routePlan.segments.find((segment) => segment.floor === activeFloor)?.points ?? null;
  }, [routePlan, activeFloor]);

  const routePathsByFloor = useMemo(() => {
    const byFloor = new Map<FloorId, Point[]>();
    if (!routePlan) return byFloor;
    for (const segment of routePlan.segments) {
      byFloor.set(segment.floor, segment.points);
    }
    return byFloor;
  }, [routePlan]);

  const projectStackedPoint = useCallback((floor: FloorId, point: Point): Point => {
    const index = FLOOR_ORDER.indexOf(floor);
    const layerY = STACKED_Y_START + index * STACKED_Y_STEP;
    const projectedX = STACKED_X + STACKED_SCALE * point.x;
    const projectedY = layerY + STACKED_SCALE * point.y;
    return { x: projectedX, y: projectedY };
  }, []);

  const stackedConnectorColumns = useMemo(() => {
    return connectors.map((connector) => ({
      connector,
      points: FLOOR_ORDER.map((floor) => projectStackedPoint(floor, connector)),
    }));
  }, [projectStackedPoint]);

  const stackedRouteBridge = useMemo(() => {
    if (!routePlan?.transferConnector || !selectedProduct) return null;
    const from = projectStackedPoint(simPosition.floor, routePlan.transferConnector);
    const to = projectStackedPoint(selectedProduct.mapLocation.floor, routePlan.transferConnector);
    return { from, to, connector: routePlan.transferConnector };
  }, [projectStackedPoint, routePlan, selectedProduct, simPosition.floor]);

  const unprojectStackedPoint = useCallback((floor: FloorId, point: Point): Point => {
    const index = FLOOR_ORDER.indexOf(floor);
    const layerY = STACKED_Y_START + index * STACKED_Y_STEP;
    return {
      x: (point.x - STACKED_X) / STACKED_SCALE,
      y: (point.y - layerY) / STACKED_SCALE,
    };
  }, []);

  const floorFromStackedPoint = useCallback((point: Point): FloorId => {
    let nearestFloor: FloorId = activeFloor;
    let best = Infinity;
    for (const floor of FLOOR_ORDER) {
      const projectedCenter = projectStackedPoint(floor, { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
      const distance = Math.abs(point.y - projectedCenter.y);
      if (distance < best) {
        best = distance;
        nearestFloor = floor;
      }
    }
    return nearestFloor;
  }, [activeFloor, projectStackedPoint]);

  const routePolyline = activeFloorPath ? toPolyline(activeFloorPath) : null;

  const routeDistance = useMemo(() => {
    if (!routePlan) return 0;
    return routePlan.segments.reduce((sum, segment) => sum + estimateDistance(segment.points), 0);
  }, [routePlan]);

  const routeEtaMinutes = useMemo(() => {
    // Rough indoor walking speed at map scale.
    return Math.max(1, Math.round(routeDistance / 230));
  }, [routeDistance]);

  const nearestAisleToPosition = (floor: FloorId, point: Point): { aisle: number; distance: number } | null => {
    const aisles = floorAisles[floor];
    if (aisles.length === 0) return null;
    let best: { aisle: number; d: number } | null = null;
    for (const aisle of aisles) {
      const d = distanceToAisleRect(point, aisle);
      if (!best || d < best.d) best = { aisle: aisle.aisle, d };
    }
    return best ? { aisle: best.aisle, distance: best.d } : null;
  };

  const advanceAlongPath = useCallback((current: Point, path: Point[], stepPx: number): { point: Point; reachedEnd: boolean } => {
    if (path.length === 0) return { point: current, reachedEnd: true };

    let nearestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < path.length; i += 1) {
      const d = Math.hypot(path[i].x - current.x, path[i].y - current.y);
      if (d < bestDistance) {
        bestDistance = d;
        nearestIndex = i;
      }
    }

    let point = current;
    let remaining = stepPx;
    for (let i = Math.min(nearestIndex + 1, path.length - 1); i < path.length && remaining > 0; i += 1) {
      const target = path[i];
      const dist = Math.hypot(target.x - point.x, target.y - point.y);
      if (dist < 0.001) continue;
      if (dist <= remaining) {
        point = target;
        remaining -= dist;
        continue;
      }
      const ratio = remaining / dist;
      point = {
        x: point.x + (target.x - point.x) * ratio,
        y: point.y + (target.y - point.y) * ratio,
      };
      remaining = 0;
    }

    const end = path[path.length - 1];
    const reachedEnd = Math.hypot(end.x - point.x, end.y - point.y) < 1;
    return { point, reachedEnd };
  }, []);

  const advanceSimulation = useCallback((stepPx = 28) => {
    const targetProduct = selectedProductRef.current;
    const targetPoint = selectedTargetPointRef.current;
    const plan = routePlanRef.current;
    if (!targetProduct || !targetPoint || !plan) return;

    setSimPosition((prev) => {
      const currentSegment = plan.segments.find((segment) => segment.floor === prev.floor);
      if (!currentSegment) return prev;

      const stepped = advanceAlongPath(prev.point, currentSegment.points, stepPx);
      if (!stepped.reachedEnd) {
        return { floor: prev.floor, point: stepped.point };
      }

      if (prev.floor !== targetProduct.mapLocation.floor && plan.transferConnector) {
        const nextFloor = targetProduct.mapLocation.floor;
        const snapped = snapToWalkable(nextFloor, plan.transferConnector);
        setActiveFloor(nextFloor);
        return { floor: nextFloor, point: snapped };
      }

      setAutoMove(false);
      return {
        floor: prev.floor,
        point: targetPoint ?? plan.destinationPoint,
      };
    });
  }, [advanceAlongPath, snapToWalkable]);

  useEffect(() => {
    selectedProductRef.current = selectedProduct;
    selectedTargetPointRef.current = routePlan?.destinationPoint ?? selectedTargetPoint;
    routePlanRef.current = routePlan;
  }, [selectedProduct, selectedTargetPoint, routePlan]);

  useEffect(() => {
    if (!autoMove) return;
    const timer = window.setInterval(() => {
      advanceSimulation(20);
    }, 320);
    return () => window.clearInterval(timer);
  }, [autoMove, advanceSimulation]);

  useEffect(() => {
    if (tapToMove) return;
    const nearest = nearestAisleToPosition(simPosition.floor, simPosition.point);
    if (!nearest) return;

    setSelectedAisle((prev) => {
      if (prev === null) return nearest.aisle;
      const previousAisle = floorAisles[simPosition.floor].find((aisle) => aisle.aisle === prev);
      if (!previousAisle) return nearest.aisle;

      const previousDistance = distanceToAisleRect(simPosition.point, previousAisle);
      const switchHysteresis = 14;
      if (previousDistance <= nearest.distance + switchHysteresis) {
        return prev;
      }
      return nearest.aisle;
    });
  }, [simPosition, tapToMove]);

  const handleMapTapToMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    if (!tapToMove || isDraggingMe) return;
    const pointer = clientToSvgPoint(event.clientX, event.clientY);
    if (!pointer) return;
    const floorPoint = stackedView ? unprojectStackedPoint(activeFloor, pointer) : pointer;
    setSimPosition({ floor: activeFloor, point: snapToWalkable(activeFloor, floorPoint) });
    setAutoMove(false);
  }, [activeFloor, clientToSvgPoint, isDraggingMe, snapToWalkable, stackedView, tapToMove, unprojectStackedPoint]);

  const handleMapPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragToMove) return;
    const pointer = clientToSvgPoint(event.clientX, event.clientY);
    if (!pointer) return;

    const dragFloor = stackedView ? floorFromStackedPoint(pointer) : activeFloor;
    dragFloorRef.current = dragFloor;
    const floorPoint = stackedView ? unprojectStackedPoint(dragFloor, pointer) : pointer;
    setSimPosition({ floor: dragFloor, point: snapToWalkable(dragFloor, floorPoint) });
    setActiveFloor(dragFloor);
    setAutoMove(false);

    dragPointerIdRef.current = event.pointerId;
    dragMovedRef.current = false;
    setIsDraggingMe(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [activeFloor, clientToSvgPoint, dragToMove, floorFromStackedPoint, snapToWalkable, stackedView, unprojectStackedPoint]);

  const handleMapPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingMe) return;
    if (dragPointerIdRef.current !== event.pointerId) return;
    const pointer = clientToSvgPoint(event.clientX, event.clientY);
    if (!pointer) return;
    const dragFloor = stackedView ? (dragFloorRef.current ?? floorFromStackedPoint(pointer)) : activeFloor;
    const floorPoint = stackedView ? unprojectStackedPoint(dragFloor, pointer) : pointer;
    dragMovedRef.current = true;
    setSimPosition({ floor: dragFloor, point: snapToWalkable(dragFloor, floorPoint) });
    if (activeFloor !== dragFloor) setActiveFloor(dragFloor);
    setAutoMove(false);
  }, [activeFloor, clientToSvgPoint, floorFromStackedPoint, isDraggingMe, snapToWalkable, stackedView, unprojectStackedPoint]);

  const handleMapPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    dragFloorRef.current = null;
    setIsDraggingMe(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6 pb-24">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-600 dark:text-gray-400">Multi-Floor Floorplan</p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">IKEA Warehouse Navigation Map</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                  Three real floorplates, vertical connectors, and aisle-level routing from entrance to exact bay.
                </p>
              </div>
              <Link to="/scan">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Scan
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Products</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.products}</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Aisles</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.aisles}</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-xl font-bold text-amber-700">{stats.lowStock}</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Out Of Stock</p>
                <p className="text-xl font-bold text-red-700">{stats.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="min-h-0 border-2 order-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Product Navigator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find product by name, article, category"
                  className="pl-9 pr-9"
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

              {loading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading mapped products...</p>}

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && searchResults.length === 0 && (
                hasNoMappedProducts ? (
                  <div className="rounded-md border bg-card p-3 text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white">No mapped products yet.</p>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Seed data from this folder: <code>docker compose --profile tools run --rm seed</code>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No products match this query.</p>
                )
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
                        "w-full rounded-md border p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                        isSelected && "border-primary bg-primary/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold leading-tight">{product.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Art. #{product.articleNumber}</p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 inline-block h-2.5 w-2.5 rounded-full shrink-0",
                            product.stock.quantity <= 0
                              ? "bg-red-500"
                              : product.stock.quantity <= LOW_STOCK_THRESHOLD
                              ? "bg-amber-500"
                              : "bg-green-500"
                          )}
                          aria-hidden="true"
                        />
                      </div>
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

          <div className="space-y-4 order-1">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Multi-Floor Topology</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant={stackedView ? "default" : "outline"}
                    onClick={() => setStackedView((prev) => !prev)}
                  >
                    {stackedView ? "Switch to Single Floor" : "Switch to Stacked View"}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Basement, ground, and top floor are rendered as a large vertical stack for quick full-warehouse visibility.</p>
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
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                        )}
                      >
                        <p className="text-xs text-gray-600 dark:text-gray-400">{meta.label}</p>
                        <p className="font-semibold leading-tight mt-1">{meta.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">{meta.description}</p>
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

                <div className="rounded-sm border-2 bg-card">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 1200 ${stackedView ? STACKED_VIEWBOX_HEIGHT : 780}`}
                    className={cn(
                      stackedView ? "h-[1500px] sm:h-[1700px] w-full" : "h-[500px] sm:h-[560px] w-full",
                      tapToMove && "cursor-crosshair",
                      dragToMove && !tapToMove && "cursor-grab",
                      isDraggingMe && "cursor-grabbing"
                    )}
                    role="img"
                    aria-label={`${floorTitle.label} map`}
                    onClick={handleMapTapToMove}
                    onPointerDown={handleMapPointerDown}
                    onPointerMove={handleMapPointerMove}
                    onPointerUp={handleMapPointerUp}
                    onPointerCancel={handleMapPointerUp}
                  >
                    <rect x="0" y="0" width="1200" height={stackedView ? STACKED_VIEWBOX_HEIGHT : 780} fill="#eef4fa" />
                    {!stackedView && (
                      <>
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
                                if (tapToMove) return;
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

                        {simPosition.floor === activeFloor && (
                          <g>
                            <circle cx={simPosition.point.x} cy={simPosition.point.y} r="24" fill="#0ea5e9" opacity="0.13" />
                            <circle cx={simPosition.point.x} cy={simPosition.point.y} r="13" fill="#0284c7" stroke="#ffffff" strokeWidth="3" />
                            <circle cx={simPosition.point.x} cy={simPosition.point.y - 4} r="3.5" fill="#ffffff" />
                            <line x1={simPosition.point.x} y1={simPosition.point.y - 1} x2={simPosition.point.x} y2={simPosition.point.y + 8} stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" />
                            <line x1={simPosition.point.x} y1={simPosition.point.y + 2} x2={simPosition.point.x - 5} y2={simPosition.point.y + 6} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                            <line x1={simPosition.point.x} y1={simPosition.point.y + 2} x2={simPosition.point.x + 5} y2={simPosition.point.y + 4} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                            <line x1={simPosition.point.x} y1={simPosition.point.y + 8} x2={simPosition.point.x - 5} y2={simPosition.point.y + 14} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                            <line x1={simPosition.point.x} y1={simPosition.point.y + 8} x2={simPosition.point.x + 5} y2={simPosition.point.y + 13} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                            <text x={simPosition.point.x + 16} y={simPosition.point.y - 8} fontSize="14">
                              🧍
                            </text>
                            <text x={simPosition.point.x} y={simPosition.point.y - 18} textAnchor="middle" fontSize="11" fill="#0c4a6e" fontWeight="800">
                              START
                            </text>
                          </g>
                        )}

                        {routePolyline && (
                          <g>
                            <polyline points={routePolyline} fill="none" stroke="#0058A3" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 8" />
                            {activeFloorPath?.[0] && <circle cx={activeFloorPath[0].x} cy={activeFloorPath[0].y} r="8" fill="#0ea5e9" stroke="#ffffff" strokeWidth="3" />}
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
                                if (tapToMove) return;
                                setSelectedProductId(marker.product._id);
                                setSelectedAisle(marker.product.mapLocation.aisle);
                              }}
                              className="cursor-pointer"
                            >
                              {isSelected && <circle cx={marker.x} cy={marker.y} r="12" fill="#bfdbfe" opacity="0.8" />}
                              <circle cx={marker.x} cy={marker.y} r={isSelected ? 7 : 5.5} fill={fill} stroke="#ffffff" strokeWidth="2" />
                              <text x={marker.x + 8} y={marker.y - 6} fontSize="11">
                                {productEmoji(marker.product)}
                              </text>
                              <title>
                                {`${marker.product.name} - Aisle ${marker.product.mapLocation.aisle}, Bay ${marker.product.mapLocation.bay}`}
                              </title>
                            </g>
                          );
                        })}

                        <text x="90" y="72" fontSize="20" fill="#0f172a" fontWeight="800">
                          {floorTitle.label} - {floorTitle.title}
                        </text>
                      </>
                    )}

                    {stackedView && (
                      <>
                        {stackedConnectorColumns.map(({ connector, points }) => (
                          <g key={`stack-column-${connector.id}`}>
                            <polyline
                              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray="8 7"
                              opacity="0.85"
                            />
                            {points.map((point, index) => (
                              <circle key={`stack-column-${connector.id}-${FLOOR_ORDER[index]}`} cx={point.x} cy={point.y} r="5" fill="#334155" stroke="#ffffff" strokeWidth="1.4" />
                            ))}
                          </g>
                        ))}

                        {stackedRouteBridge && (
                          <g>
                            <line
                              x1={stackedRouteBridge.from.x}
                              y1={stackedRouteBridge.from.y}
                              x2={stackedRouteBridge.to.x}
                              y2={stackedRouteBridge.to.y}
                              stroke="#0058A3"
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeDasharray="11 8"
                            />
                          </g>
                        )}

                        {FLOOR_ORDER.map((floor, index) => {
                          const offsetY = STACKED_Y_START + index * STACKED_Y_STEP;
                          const markers = markerPointsByFloor.get(floor) ?? [];
                          const floorPath = routePathsByFloor.get(floor) ?? null;
                          const pathLine = floorPath ? toPolyline(floorPath) : null;
                          const isLayerActive = floor === activeFloor;
                          const opacity = isLayerActive ? 1 : floor === simPosition.floor ? 0.9 : 0.76;

                          return (
                            <g
                              key={`stack-layer-${floor}`}
                              transform={`translate(${STACKED_X} ${offsetY}) scale(${STACKED_SCALE})`}
                              opacity={opacity}
                            >
                              <rect x="-8" y="-8" width="1216" height="796" rx="18" fill="#ffffff" stroke={isLayerActive ? "#2563eb" : "#cbd5e1"} strokeWidth={isLayerActive ? "5" : "2"} />
                              {renderFloorScenery(floor)}
                              {floorAisles[floor].map((aisle) => {
                                const stat = aisleStatsByFloor.get(floor)?.get(aisle.aisle);
                                let fill = "#e5e7eb";
                                let stroke = "#94a3b8";
                                if (stat?.out) {
                                  fill = "#fee2e2";
                                  stroke = "#f87171";
                                } else if (stat?.low) {
                                  fill = "#fef3c7";
                                  stroke = "#f59e0b";
                                } else if (stat && stat.total > 0) {
                                  fill = "#dcfce7";
                                  stroke = "#4ade80";
                                }
                                if (selectedAisle === aisle.aisle && floor === activeFloor) {
                                  fill = "#dbeafe";
                                  stroke = "#2563eb";
                                }
                                return <rect key={`stack-aisle-${floor}-${aisle.aisle}`} x={aisle.x} y={aisle.y} width={aisle.width} height={aisle.height} rx="7" fill={fill} stroke={stroke} strokeWidth="1.6" />;
                              })}
                              {connectors.map((connector) => (
                                <g key={`stack-connector-${floor}-${connector.id}`}>
                                  {connectorGlyph(connector)}
                                  <text x={connector.x} y={connector.y + 21} textAnchor="middle" fontSize="9" fill="#0f172a" fontWeight="600">
                                    {connectorSymbol(connector.kind)}
                                  </text>
                                </g>
                              ))}
                              {pathLine && (
                                <polyline
                                  points={pathLine}
                                  fill="none"
                                  stroke="#0058A3"
                                  strokeWidth={floor === activeFloor ? "7" : "5"}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="12 8"
                                />
                              )}
                              {markers.map((marker) => {
                                const isSelected = selectedProductId === marker.product._id;
                                const fill = marker.tier === "out" ? "#dc2626" : marker.tier === "low" ? "#d97706" : "#15803d";
                                return (
                                  <g key={`stack-marker-${floor}-${marker.product._id}`}>
                                    {isSelected && <circle cx={marker.x} cy={marker.y} r="12" fill="#bfdbfe" opacity="0.8" />}
                                    <circle cx={marker.x} cy={marker.y} r={isSelected ? 7 : 5.2} fill={fill} stroke="#ffffff" strokeWidth="2" />
                                    <text x={marker.x + 8} y={marker.y - 6} fontSize="10">
                                      {productEmoji(marker.product)}
                                    </text>
                                  </g>
                                );
                              })}
                              {simPosition.floor === floor && (
                                <g>
                                  <circle cx={simPosition.point.x} cy={simPosition.point.y} r="21" fill="#0ea5e9" opacity="0.2" />
                                  <circle cx={simPosition.point.x} cy={simPosition.point.y} r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="3" />
                                  <text x={simPosition.point.x + 12} y={simPosition.point.y - 7} fontSize="12">
                                    🧍
                                  </text>
                                </g>
                              )}
                              <text x="42" y="72" fontSize="22" fill="#0f172a" fontWeight="900">
                                {index + 1}
                              </text>
                              <text x="90" y="72" fontSize="20" fill="#0f172a" fontWeight="800">
                                {floorMeta[floor].label} - {floorMeta[floor].title}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    )}
                  </svg>
                </div>

                <div className="rounded-sm border-2 bg-white/90 dark:bg-gray-900/70 p-3">
                  <p className="font-semibold text-sm tracking-wide text-gray-900 dark:text-white">Legend</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-xs text-gray-800 dark:text-gray-100">
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#dc2626]" />
                      Out (0)
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#d97706]" />
                      Low (1-10)
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#15803d]" />
                      Healthy (11+)
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#1d4ed8]" />
                      Selected Route/Product
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-white border border-slate-500" />
                      Floor Connector
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-0.5 w-6 rounded bg-slate-500" />
                      Vertical topology link
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span className="h-0.5 w-6 rounded bg-[#0058A3]" />
                      Floor transfer route
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span>🧍</span>
                      Start position
                    </div>
                    <div className="rounded-sm border bg-gray-50 dark:bg-gray-800 p-2 inline-flex items-center gap-2">
                      <span>📦</span>
                      Product marker
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Route Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-sm border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide text-gray-900 dark:text-white inline-flex items-center gap-1">
                        <Route className="h-3.5 w-3.5" />
                        Movement Simulator
                      </p>
                      <Badge variant="outline">
                        <PersonStanding className="h-3.5 w-3.5 mr-1" />
                        {floorMeta[simPosition.floor].label} · x{Math.round(simPosition.point.x)} y{Math.round(simPosition.point.y)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={tapToMove ? "default" : "outline"}
                        onClick={() => setTapToMove((prev) => !prev)}
                      >
                        <Crosshair className="h-3.5 w-3.5 mr-1" />
                        Tap-to-Move
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={dragToMove ? "default" : "outline"}
                        onClick={() => setDragToMove((prev) => !prev)}
                      >
                        <Move className="h-3.5 w-3.5 mr-1" />
                        Drag Me
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSimPosition({ floor: "L0", point: snapToWalkable("L0", floorMeta.L0.entry) });
                          setActiveFloor("L0");
                          setAutoMove(false);
                        }}
                      >
                        Reset Start
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => advanceSimulation(36)}
                        disabled={!routePlan}
                      >
                        <StepForward className="h-3.5 w-3.5 mr-1" />
                        Step
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={autoMove ? "default" : "outline"}
                        onClick={() => setAutoMove((prev) => !prev)}
                        disabled={!routePlan}
                      >
                        {autoMove ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                        {autoMove ? "Pause" : "Auto Follow"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Floor transfer:</span>
                      <Button type="button" size="sm" variant={transferMode === "any" ? "default" : "outline"} onClick={() => setTransferMode("any")}>
                        Any
                      </Button>
                      <Button type="button" size="sm" variant={transferMode === "stairs" ? "default" : "outline"} onClick={() => setTransferMode("stairs")}>
                        Stairs
                      </Button>
                      <Button type="button" size="sm" variant={transferMode === "escalator" ? "default" : "outline"} onClick={() => setTransferMode("escalator")}>
                        Escalator
                      </Button>
                      <Button type="button" size="sm" variant={transferMode === "elevator" ? "default" : "outline"} onClick={() => setTransferMode("elevator")}>
                        Elevator
                      </Button>
                    </div>
                    {routePlan && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Estimated route length: {Math.round(routeDistance)} units · ETA {routeEtaMinutes} min
                      </p>
                    )}
                  </div>

                  {selectedProduct ? (
                    <>
                      <div className="rounded-sm border bg-primary/5 p-3">
                        <p className="text-xs font-semibold tracking-wide text-primary">Focused Product</p>
                        <p className="text-sm font-semibold mt-1">{selectedProduct.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{selectedProduct.articleNumber}</p>
                        <p className="text-xs mt-1 inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {floorMeta[selectedProduct.mapLocation.floor].label}, aisle {selectedProduct.mapLocation.aisle}, bay {selectedProduct.mapLocation.bay}, section {selectedProduct.mapLocation.section}
                        </p>
                        <p className="text-xs mt-2 font-medium" style={{ color: stockColor(selectedProduct.stock.quantity) }}>
                          Stock: {selectedProduct.stock.quantity}
                        </p>
                      </div>

                      <ol className="space-y-2 text-sm">
                        {(routePlan?.steps ?? []).map((step, index) => (
                          <li key={step} className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {!routePlan && (
                        <p className="text-xs text-destructive">
                          No walkable route found from current position. Move closer to an open lane or use Tap-to-Move.
                        </p>
                      )}

                      {routePlan?.transferConnector && selectedProduct.mapLocation.floor !== simPosition.floor && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 inline-flex items-center gap-1">
                          <Navigation className="h-3.5 w-3.5" />
                          Vertical transfer uses {routePlan.transferConnector.label}.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Select a product to generate a route.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Aisle Inventory ({selectedAisle ?? "-"})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedAisleProducts.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No mapped products in this aisle on {floorTitle.label}.</p>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                      {selectedAisleProducts.map((product) => (
                        <button
                          key={`aisle-product-${product._id}`}
                          onClick={() => setSelectedProductId(product._id)}
                          className={cn(
                            "w-full rounded-md border p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                            selectedProductId === product._id && "border-primary bg-primary/10"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-tight">{product.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Art. #{product.articleNumber}</p>
                            </div>
                            <Badge variant={stockBadgeVariant(product.stock.quantity)}>{product.stock.quantity}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
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
