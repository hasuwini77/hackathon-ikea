import React, { useState, useCallback } from "react";
import { Badge } from "~/components/ui/badge";
import { Hash, Zap } from "lucide-react";
import type { Product } from "~/types/product";
import { decodeAxisName } from "~/lib/axis/decoder";

// ─── keyboard ────────────────────────────────────────────────────────
const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "⌫", "CLR"],
];

const MAX_LETTERS = 10;

// ─── segment colours (Zone / Aisle / Bay) ────────────────────────────
const SEG = {
  zone:  { bg: "#EF4444", label: "text-red-100" },
  aisle: { bg: "#3B82F6", label: "text-blue-100" },
  bay:   { bg: "#22C55E", label: "text-green-100" },
};

// ─── mini floor plan ─────────────────────────────────────────────────
const AISLES = 8;
const BAYS   = 6;
const CW = 28;
const CH = 22;

function zoneBandColor(row: number): string {
  if (row < 2) return "#FEF9C3"; // showroom
  if (row < 4) return "#DBEAFE"; // market
  return "#F3F4F6";              // warehouse
}

function MiniFloorPlan({ aisle, bay }: { aisle: string; bay: string }) {
  const ai = Math.min(Math.max((parseInt(aisle) || 1) - 1, 0), AISLES - 1);
  const bi = Math.min(Math.max((parseInt(bay)   || 1) - 1, 0), BAYS   - 1);
  const W  = AISLES * CW + 30;
  const H  = BAYS   * CH + 24;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-sm border-2 border-black"
      aria-label="Store grid with product location highlighted"
    >
      {/* Aisle number column headers */}
      {Array.from({ length: AISLES }, (_, i) => (
        <text
          key={i}
          x={i * CW + 14 + CW / 2}
          y={12}
          fontSize="7"
          textAnchor="middle"
          fontFamily="monospace"
          fill="#9ca3af"
        >
          {i + 1}
        </text>
      ))}

      {/* Grid cells */}
      {Array.from({ length: AISLES }, (_, col) =>
        Array.from({ length: BAYS }, (_, row) => {
          const found = col === ai && row === bi;
          return (
            <rect
              key={`${col}-${row}`}
              x={col * CW + 14 + 1}
              y={row * CH + 16 + 1}
              width={CW - 2}
              height={CH - 2}
              fill={found ? "#FBBF24" : zoneBandColor(row)}
              stroke={found ? "#000" : "#d1d5db"}
              strokeWidth={found ? 2 : 0.5}
            />
          );
        })
      )}

      {/* Pulsing dot on found location */}
      <circle
        cx={ai * CW + 14 + CW / 2}
        cy={bi * CH + 16 + CH / 2}
        r="4"
        fill="black"
        opacity="0.75"
      >
        <animate attributeName="r"       values="3;5;3"       dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" />
      </circle>

      {/* Zone labels on right side */}
      <text x={AISLES * CW + 16} y={16 + CH}       fontSize="6" fill="#9ca3af" fontFamily="monospace">SH</text>
      <text x={AISLES * CW + 16} y={16 + 3 * CH}   fontSize="6" fill="#9ca3af" fontFamily="monospace">MK</text>
      <text x={AISLES * CW + 16} y={16 + 5 * CH}   fontSize="6" fill="#9ca3af" fontFamily="monospace">WH</text>
    </svg>
  );
}

// ─── semantic decoder ─────────────────────────────────────────────────
function AxisDecoder({ product }: { product: Product }) {
  const d = decodeAxisName(product.name, product.location);

  const charSegment = (i: number): keyof typeof SEG => {
    if (i < d.zoneSegment.length) return "zone";
    if (i >= d.name.length - d.baySegment.length && d.baySegment.length > 0) return "bay";
    return "aisle";
  };

  return (
    <div className="border-2 border-black p-3 space-y-3 bg-gray-50">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        AXIS Semantic Decoder — Layer I
      </p>

      {/* Coloured letter tiles */}
      <div className="flex gap-1">
        {d.name.split("").map((ch, i) => {
          const seg = charSegment(i);
          return (
            <div
              key={i}
              className="w-8 h-8 flex items-center justify-center border-2 font-black text-base text-white"
              style={{ backgroundColor: SEG[seg].bg, borderColor: SEG[seg].bg }}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* Segment → coordinate legend */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 shrink-0" style={{ background: SEG.zone.bg }} />
          <span className="truncate">
            <span className="opacity-50">{d.zoneSegment || "—"} →&nbsp;</span>
            {d.zoneName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 shrink-0" style={{ background: SEG.aisle.bg }} />
          <span className="truncate">
            <span className="opacity-50">{d.aisleSegment || "—"} →&nbsp;</span>
            Aisle {d.aisle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 shrink-0" style={{ background: SEG.bay.bg }} />
          <span className="truncate">
            <span className="opacity-50">{d.baySegment || "—"} →&nbsp;</span>
            Bay {d.bay}{d.section}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── keyboard tile ────────────────────────────────────────────────────
function KeyTile({ label, onPress }: { label: string; onPress: () => void }) {
  const isAction = label === "⌫" || label === "CLR";
  return (
    <button
      onClick={onPress}
      className={[
        "h-11 font-black text-sm uppercase border-2 border-black",
        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        "transition-all duration-75 select-none",
        isAction
          ? "bg-gray-200 text-gray-700 px-3 min-w-[48px]"
          : "bg-white w-9",
      ].join(" ")}
      aria-label={label === "⌫" ? "Backspace" : label === "CLR" ? "Clear" : label}
    >
      {label}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────
interface AnalogMapFallbackProps {
  products: Product[];
}

export function AnalogMapFallback({ products }: AnalogMapFallbackProps) {
  const [letters, setLetters] = useState<string[]>([]);

  const typed = letters.join("");

  const foundProduct = products.find(
    (p) =>
      p.name.replace(/[^A-Za-z]/g, "").toUpperCase() === typed ||
      p.name.toUpperCase() === typed
  );

  const press = useCallback(
    (key: string) => {
      if (key === "⌫") {
        setLetters((prev) => prev.slice(0, -1));
      } else if (key === "CLR") {
        setLetters([]);
      } else if (letters.length < MAX_LETTERS) {
        setLetters((prev) => [...prev, key]);
      }
    },
    [letters]
  );

  return (
    <div className="flex flex-col h-full bg-white text-black font-mono select-none overflow-y-auto">

      {/* ── Station header ── */}
      <div className="bg-black text-yellow-400 px-4 py-3 flex items-start justify-between shrink-0">
        <div>
          <div className="text-base md:text-lg font-black uppercase tracking-tight leading-none">
            AXIS PHYGITAL STATION
          </div>
          <div className="text-[10px] text-yellow-600 uppercase tracking-widest mt-0.5">
            Layer II Fallback · Zero-Power · Zero-Network
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-yellow-600 font-black uppercase text-right">
          <Zap className="h-3 w-3" />
          <span>Always On</span>
        </div>
      </div>

      {/* ── Combination-lock display ── */}
      <div className="bg-gray-950 px-4 py-3 flex gap-1.5 overflow-x-auto shrink-0 border-b-2 border-yellow-500">
        {Array.from({ length: MAX_LETTERS }, (_, i) => (
          <div
            key={i}
            className={[
              "w-9 h-12 flex items-center justify-center text-2xl font-black border-2 shrink-0",
              letters[i]
                ? "bg-yellow-400 text-black border-yellow-500"
                : "bg-gray-800 text-gray-700 border-gray-700",
            ].join(" ")}
          >
            {letters[i] ?? ""}
          </div>
        ))}
      </div>

      {/* ── Tactile keyboard ── */}
      <div className="px-3 py-3 space-y-2 shrink-0 bg-gray-100 border-b-4 border-black">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1.5 flex-wrap">
            {row.map((key) => (
              <KeyTile key={key} label={key} onPress={() => press(key)} />
            ))}
          </div>
        ))}
      </div>

      {/* ── Result area ── */}
      <div className="p-4 flex-1">
        {foundProduct ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Match banner */}
            <div className="bg-yellow-400 border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-yellow-800 tracking-widest">
                    Product Located
                  </p>
                  <p className="text-2xl font-black leading-tight">{foundProduct.name}</p>
                  <p className="text-sm font-bold text-gray-700">{foundProduct.category}</p>
                </div>
                <Badge className="border-4 border-black rounded-none text-sm font-black bg-black text-yellow-400 px-3 py-1 shrink-0">
                  {foundProduct.location.zone
                    ? foundProduct.location.zone.substring(0, 2).toUpperCase()
                    : "WH"}
                  -{foundProduct.location.aisle}-{foundProduct.location.bay}
                  {foundProduct.location.section}
                </Badge>
              </div>
            </div>

            {/* Big coordinate grid */}
            <div className="grid grid-cols-4 gap-0 border-4 border-black overflow-hidden">
              {[
                {
                  label: "Zone",
                  value: foundProduct.location.zone
                    ? foundProduct.location.zone.substring(0, 2).toUpperCase()
                    : "WH",
                },
                { label: "Aisle", value: foundProduct.location.aisle },
                { label: "Bay",   value: foundProduct.location.bay },
                { label: "Sec",   value: foundProduct.location.section },
              ].map(({ label, value }, idx, arr) => (
                <div
                  key={label}
                  className={[
                    "text-center py-4",
                    idx < arr.length - 1 ? "border-r-4 border-black" : "",
                  ].join(" ")}
                >
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">
                    {label}
                  </p>
                  <p className="text-5xl font-black leading-none">{value}</p>
                </div>
              ))}
            </div>

            {/* Semantic name decoder */}
            <AxisDecoder product={foundProduct} />

            {/* Mini floor plan */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Store Grid Reference
              </p>
              <MiniFloorPlan
                aisle={foundProduct.location.aisle}
                bay={foundProduct.location.bay}
              />
              <div className="flex flex-wrap gap-3 text-[10px] font-bold mt-1">
                {[
                  { color: "#FEF9C3", label: "Showroom" },
                  { color: "#DBEAFE", label: "Market" },
                  { color: "#F3F4F6", label: "Warehouse" },
                  { color: "#FBBF24", label: "You Are Here", border: true },
                ].map(({ color, label, border }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span
                      className="inline-block w-3 h-3"
                      style={{
                        background: color,
                        border: border ? "2px solid black" : "1px solid #d1d5db",
                      }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        ) : typed.length > 0 ? (
          <div className="border-4 border-black bg-red-600 text-white p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-200">
            <Hash className="h-12 w-12 mx-auto mb-3" />
            <p className="text-xl font-black uppercase">Tile Combination Invalid</p>
            <p className="font-bold text-red-200 mt-1">
              "{typed}" not found in grid index
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-center gap-2">
            <div className="text-4xl">☰</div>
            <p className="font-black uppercase text-sm tracking-widest">
              Slide tiles to spell
            </p>
            <p className="font-bold text-xs">the product name above</p>
          </div>
        )}
      </div>
    </div>
  );
}
