/**
 * IKEA AXIS — Layer I: Semantic Architecture (Mnemonic Layer)
 *
 * Product names encode spatial coordinates:
 *   Prefix  (first 1-2 chars) → Category / Hall (Zone)
 *   Middle  (inner chars)     → Aisle / Grid
 *   Suffix  (last 1-2 chars)  → Shelf / Level (Bay + Section)
 *
 * This decoder makes the encoding visible so that — even without any
 * screen or network — staff can "read" a location from a product name.
 */

export interface AxisDecoding {
  /** Cleaned uppercase name (letters only) */
  name: string;
  /** First segment — encodes the Zone */
  zoneSegment: string;
  /** Middle segment — encodes the Aisle */
  aisleSegment: string;
  /** Last segment — encodes Bay + Section */
  baySegment: string;
  /** 2-letter zone code, e.g. "SH" */
  zoneCode: string;
  /** Human-readable zone name */
  zoneName: string;
  aisle: string;
  bay: string;
  section: string;
  /** Full AXIS coordinate string, e.g. "SH-4-5C" */
  coordinate: string;
}

const ZONE_NAMES: Record<string, string> = {
  showroom:  "Showroom Hall",
  market:    "Market Area",
  warehouse: "Warehouse",
  sh:        "Showroom Hall",
  ma:        "Market Area",
  wh:        "Warehouse",
};

/**
 * Split a name into exactly three spatial segments.
 * Short names (≤3 chars) get one char per segment.
 * Medium names (4-5) use 1-char ends.
 * Long names (6+) use 2-char ends.
 */
function splitIntoSegments(name: string): [string, string, string] {
  const len = name.length;
  if (len <= 1) return [name, "", ""];
  if (len === 2) return [name[0], "", name[1]];
  if (len === 3) return [name[0], name[1], name[2]];
  if (len <= 5) {
    return [name.slice(0, 1), name.slice(1, len - 1), name.slice(len - 1)];
  }
  return [name.slice(0, 2), name.slice(2, len - 2), name.slice(len - 2)];
}

export function decodeAxisName(
  name: string,
  location: { zone?: string; aisle: string; bay: string; section: string }
): AxisDecoding {
  const cleaned = name.toUpperCase().replace(/[^A-Z]/g, "");
  const [zoneSegment, aisleSegment, baySegment] = splitIntoSegments(cleaned);

  const zoneRaw = (location.zone || "warehouse").toLowerCase();
  const zoneCode = zoneRaw.substring(0, 2).toUpperCase();
  const zoneName = ZONE_NAMES[zoneRaw] ?? ZONE_NAMES[zoneCode.toLowerCase()] ?? "Warehouse";

  const coordinate = `${zoneCode}-${location.aisle}-${location.bay}${location.section}`;

  return {
    name: cleaned,
    zoneSegment,
    aisleSegment,
    baySegment,
    zoneCode,
    zoneName,
    aisle: location.aisle,
    bay: location.bay,
    section: location.section,
    coordinate,
  };
}
