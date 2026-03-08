/**
 * IKEA Store Floor Plan Specification
 *
 * This file contains a realistic IKEA store layout with:
 * - Curved showroom path (the famous "IKEA maze")
 * - Market hall sections
 * - Self-serve warehouse with numbered aisles
 * - Service areas and shortcuts
 *
 * Coordinate system: 1200x800 viewBox
 */

export interface StoreZone {
  id: string;
  name: string;
  type: 'showroom' | 'market' | 'warehouse' | 'service';
  // SVG path or polygon coordinates
  path: string;
  // Color for the zone
  fill: string;
  // Center point for label
  labelX: number;
  labelY: number;
  // Aisles in this zone (for warehouse)
  aisles?: { number: number; x: number; y: number; width: number; height: number }[];
}

export interface FloorPlan {
  width: number;
  height: number;
  zones: StoreZone[];
  // Walls, paths, etc.
  paths: { d: string; stroke: string; strokeWidth?: number; fill?: string }[];
  // Entry/exit points
  entrances: { x: number; y: number; label: string; type: 'entrance' | 'exit' | 'shortcut' }[];
}

// IKEA Brand Colors
const COLORS = {
  // Showroom sections - warm, inviting tones
  livingRoom: '#F4E8D8',
  bedroom: '#E8D8E8',
  homeOffice: '#D8E8F4',
  kitchen: '#F8E8C8',
  dining: '#E8F4D8',
  childrens: '#FFE8D8',
  bathroom: '#D8F4F4',

  // Market hall - lighter, shopping tones
  textiles: '#F0E8F8',
  cookshop: '#F8F0E8',
  organization: '#E8F8F0',
  lighting: '#FFF8E8',
  decoration: '#F8E8F8',
  plants: '#E8F8E8',

  // Warehouse - industrial
  warehouse: '#E0E0E0',

  // Service areas
  service: '#FFFFFF',
  checkout: '#FFF0B3',

  // Paths and walls
  mainPath: '#FFDB00',  // IKEA Yellow
  shortcut: '#0051BA',  // IKEA Blue
  wall: '#333333',
};

export const IKEA_FLOOR_PLAN: FloorPlan = {
  width: 1200,
  height: 800,

  zones: [
    // ENTRANCE/LOBBY
    {
      id: 'entrance',
      name: 'Entrance & Lobby',
      type: 'service',
      path: 'M 50,50 L 250,50 L 250,150 L 50,150 Z',
      fill: COLORS.service,
      labelX: 150,
      labelY: 100,
    },

    // SHOWROOM ZONES (Upper level feel - following the curved path)
    {
      id: 'living-room',
      name: 'Living Rooms',
      type: 'showroom',
      path: 'M 250,50 L 450,50 L 450,200 L 250,200 Z',
      fill: COLORS.livingRoom,
      labelX: 350,
      labelY: 125,
    },
    {
      id: 'bedroom',
      name: 'Bedrooms',
      type: 'showroom',
      path: 'M 450,50 L 650,50 L 650,200 L 450,200 Z',
      fill: COLORS.bedroom,
      labelX: 550,
      labelY: 125,
    },
    {
      id: 'home-office',
      name: 'Home Office',
      type: 'showroom',
      path: 'M 650,50 L 850,50 L 850,200 L 650,200 Z',
      fill: COLORS.homeOffice,
      labelX: 750,
      labelY: 125,
    },
    {
      id: 'kitchen',
      name: 'Kitchens',
      type: 'showroom',
      path: 'M 850,50 L 1150,50 L 1150,200 L 850,200 Z',
      fill: COLORS.kitchen,
      labelX: 1000,
      labelY: 125,
    },
    {
      id: 'dining',
      name: 'Dining',
      type: 'showroom',
      path: 'M 1000,200 L 1150,200 L 1150,350 L 1000,350 Z',
      fill: COLORS.dining,
      labelX: 1075,
      labelY: 275,
    },
    {
      id: 'childrens',
      name: "Children's IKEA",
      type: 'showroom',
      path: 'M 800,200 L 1000,200 L 1000,350 L 800,350 Z',
      fill: COLORS.childrens,
      labelX: 900,
      labelY: 275,
    },
    {
      id: 'bathroom',
      name: 'Bathrooms',
      type: 'showroom',
      path: 'M 600,200 L 800,200 L 800,350 L 600,350 Z',
      fill: COLORS.bathroom,
      labelX: 700,
      labelY: 275,
    },

    // MARKET HALL (Lower level feel)
    {
      id: 'textiles',
      name: 'Textiles & Rugs',
      type: 'market',
      path: 'M 250,200 L 450,200 L 450,350 L 250,350 Z',
      fill: COLORS.textiles,
      labelX: 350,
      labelY: 275,
    },
    {
      id: 'cookshop',
      name: 'Cookshop & Tableware',
      type: 'market',
      path: 'M 450,200 L 600,200 L 600,350 L 450,350 Z',
      fill: COLORS.cookshop,
      labelX: 525,
      labelY: 275,
    },
    {
      id: 'organization',
      name: 'Home Organization',
      type: 'market',
      path: 'M 250,350 L 450,350 L 450,450 L 250,450 Z',
      fill: COLORS.organization,
      labelX: 350,
      labelY: 400,
    },
    {
      id: 'lighting',
      name: 'Lighting',
      type: 'market',
      path: 'M 450,350 L 600,350 L 600,450 L 450,450 Z',
      fill: COLORS.lighting,
      labelX: 525,
      labelY: 400,
    },
    {
      id: 'decoration',
      name: 'Wall Decoration',
      type: 'market',
      path: 'M 600,350 L 800,350 L 800,450 L 600,450 Z',
      fill: COLORS.decoration,
      labelX: 700,
      labelY: 400,
    },
    {
      id: 'plants',
      name: 'Plants & Pots',
      type: 'market',
      path: 'M 800,350 L 1000,350 L 1000,450 L 800,450 Z',
      fill: COLORS.plants,
      labelX: 900,
      labelY: 400,
    },

    // SELF-SERVE WAREHOUSE
    {
      id: 'warehouse',
      name: 'Self-Serve Warehouse',
      type: 'warehouse',
      path: 'M 50,500 L 1000,500 L 1000,750 L 50,750 Z',
      fill: COLORS.warehouse,
      labelX: 525,
      labelY: 480,
      aisles: [
        // 6 rows of aisles, 5 aisles per row = 30 aisles total
        // Row 1 (Aisles 1-5)
        { number: 1, x: 70, y: 520, width: 170, height: 35 },
        { number: 2, x: 250, y: 520, width: 170, height: 35 },
        { number: 3, x: 430, y: 520, width: 170, height: 35 },
        { number: 4, x: 610, y: 520, width: 170, height: 35 },
        { number: 5, x: 790, y: 520, width: 170, height: 35 },

        // Row 2 (Aisles 6-10)
        { number: 6, x: 70, y: 565, width: 170, height: 35 },
        { number: 7, x: 250, y: 565, width: 170, height: 35 },
        { number: 8, x: 430, y: 565, width: 170, height: 35 },
        { number: 9, x: 610, y: 565, width: 170, height: 35 },
        { number: 10, x: 790, y: 565, width: 170, height: 35 },

        // Row 3 (Aisles 11-15)
        { number: 11, x: 70, y: 610, width: 170, height: 35 },
        { number: 12, x: 250, y: 610, width: 170, height: 35 },
        { number: 13, x: 430, y: 610, width: 170, height: 35 },
        { number: 14, x: 610, y: 610, width: 170, height: 35 },
        { number: 15, x: 790, y: 610, width: 170, height: 35 },

        // Row 4 (Aisles 16-20)
        { number: 16, x: 70, y: 655, width: 170, height: 35 },
        { number: 17, x: 250, y: 655, width: 170, height: 35 },
        { number: 18, x: 430, y: 655, width: 170, height: 35 },
        { number: 19, x: 610, y: 655, width: 170, height: 35 },
        { number: 20, x: 790, y: 655, width: 170, height: 35 },

        // Row 5 (Aisles 21-25)
        { number: 21, x: 70, y: 700, width: 170, height: 35 },
        { number: 22, x: 250, y: 700, width: 170, height: 35 },
        { number: 23, x: 430, y: 700, width: 170, height: 35 },
        { number: 24, x: 610, y: 700, width: 170, height: 35 },
        { number: 25, x: 790, y: 700, width: 170, height: 35 },

        // Row 6 (Aisles 26-30)
        { number: 26, x: 70, y: 745, width: 170, height: 35 },
        { number: 27, x: 250, y: 745, width: 170, height: 35 },
        { number: 28, x: 430, y: 745, width: 170, height: 35 },
        { number: 29, x: 610, y: 745, width: 170, height: 35 },
        { number: 30, x: 790, y: 745, width: 170, height: 35 },
      ],
    },

    // CHECKOUT AREA
    {
      id: 'checkout',
      name: 'Checkout',
      type: 'service',
      path: 'M 1000,500 L 1150,500 L 1150,650 L 1000,650 Z',
      fill: COLORS.checkout,
      labelX: 1075,
      labelY: 575,
    },

    // EXIT/LOADING
    {
      id: 'exit',
      name: 'Exit & Loading',
      type: 'service',
      path: 'M 1000,650 L 1150,650 L 1150,750 L 1000,750 Z',
      fill: COLORS.service,
      labelX: 1075,
      labelY: 700,
    },
  ],

  // Paths representing the customer flow and shortcuts
  paths: [
    // Outer walls
    {
      d: 'M 50,50 L 1150,50 L 1150,750 L 50,750 Z',
      stroke: COLORS.wall,
      strokeWidth: 4,
      fill: 'none',
    },

    // Main showroom path (the famous IKEA maze) - curved yellow path
    {
      d: `
        M 150,150
        L 350,150
        Q 400,150 400,200
        L 400,220
        Q 400,270 450,270
        L 700,270
        Q 750,270 750,320
        L 750,380
        Q 750,430 700,430
        L 350,430
        L 350,480
      `,
      stroke: COLORS.mainPath,
      strokeWidth: 8,
      fill: 'none',
    },

    // Shortcuts (blue dotted lines)
    {
      d: 'M 250,200 L 250,350',
      stroke: COLORS.shortcut,
      strokeWidth: 3,
    },
    {
      d: 'M 450,200 L 450,350',
      stroke: COLORS.shortcut,
      strokeWidth: 3,
    },
    {
      d: 'M 600,200 L 600,450',
      stroke: COLORS.shortcut,
      strokeWidth: 3,
    },
    {
      d: 'M 800,200 L 800,450',
      stroke: COLORS.shortcut,
      strokeWidth: 3,
    },

    // Warehouse to checkout path
    {
      d: 'M 1000,625 L 1050,625',
      stroke: COLORS.mainPath,
      strokeWidth: 6,
      fill: 'none',
    },
  ],

  // Entry/exit points
  entrances: [
    {
      x: 150,
      y: 50,
      label: 'Main Entrance',
      type: 'entrance',
    },
    {
      x: 250,
      y: 200,
      label: 'Shortcut to Market',
      type: 'shortcut',
    },
    {
      x: 450,
      y: 200,
      label: 'Shortcut to Cookshop',
      type: 'shortcut',
    },
    {
      x: 600,
      y: 200,
      label: 'Shortcut to Decoration',
      type: 'shortcut',
    },
    {
      x: 800,
      y: 200,
      label: 'Shortcut to Plants',
      type: 'shortcut',
    },
    {
      x: 500,
      y: 500,
      label: 'Warehouse Entrance',
      type: 'entrance',
    },
    {
      x: 1075,
      y: 750,
      label: 'Exit',
      type: 'exit',
    },
  ],
};

/**
 * Helper function to find a zone by ID
 */
export function getZoneById(zoneId: string): StoreZone | undefined {
  return IKEA_FLOOR_PLAN.zones.find(zone => zone.id === zoneId);
}

/**
 * Helper function to get all zones of a specific type
 */
export function getZonesByType(type: StoreZone['type']): StoreZone[] {
  return IKEA_FLOOR_PLAN.zones.filter(zone => zone.type === type);
}

/**
 * Helper function to find which zone contains a point
 */
export function getZoneAtPoint(x: number, y: number): StoreZone | undefined {
  // Simple bounding box check for rectangular zones
  for (const zone of IKEA_FLOOR_PLAN.zones) {
    // Parse the path to get coordinates (simplified for rectangular zones)
    const pathMatch = zone.path.match(/M ([\d.]+),([\d.]+) L ([\d.]+),([\d.]+) L ([\d.]+),([\d.]+) L ([\d.]+),([\d.]+)/);
    if (pathMatch) {
      const x1 = parseFloat(pathMatch[1]);
      const y1 = parseFloat(pathMatch[2]);
      const x2 = parseFloat(pathMatch[5]);
      const y2 = parseFloat(pathMatch[6]);

      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return zone;
      }
    }
  }
  return undefined;
}

/**
 * Helper function to find an aisle by number
 */
export function getAisleByNumber(aisleNumber: number): { zone: StoreZone; aisle: NonNullable<StoreZone['aisles']>[0] } | undefined {
  const warehouse = IKEA_FLOOR_PLAN.zones.find(z => z.id === 'warehouse');
  if (!warehouse?.aisles) return undefined;

  const aisle = warehouse.aisles.find(a => a.number === aisleNumber);
  if (!aisle) return undefined;

  return { zone: warehouse, aisle };
}

/**
 * Get all showroom zones in typical customer flow order
 */
export function getShowroomFlow(): StoreZone[] {
  const showroomOrder = [
    'living-room',
    'bedroom',
    'home-office',
    'kitchen',
    'dining',
    'childrens',
    'bathroom',
  ];

  return showroomOrder
    .map(id => getZoneById(id))
    .filter((zone): zone is StoreZone => zone !== undefined);
}

/**
 * Get all market hall zones in typical customer flow order
 */
export function getMarketHallFlow(): StoreZone[] {
  const marketOrder = [
    'textiles',
    'cookshop',
    'organization',
    'lighting',
    'decoration',
    'plants',
  ];

  return marketOrder
    .map(id => getZoneById(id))
    .filter((zone): zone is StoreZone => zone !== undefined);
}
