export interface Product3D {
  id: string;
  name: string;
  position: [number, number, number]; // [x, y, z]
  aisle: string;
  shelf: number;
  zone: 'showroom' | 'market' | 'warehouse';
  floor: number; // 0, 1, 2 for ground, first, second
}

export interface Aisle3D {
  id: string;
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
  zone: 'showroom' | 'market' | 'warehouse';
  floor: number;
  shelfCount: number;
}

export interface Floor3D {
  id: number;
  name: string;
  height: number; // Y position
  size: [number, number]; // [width, depth]
  zones: {
    showroom: boolean;
    market: boolean;
    warehouse: boolean;
  };
}

export interface CameraMode {
  mode: 'orbit' | 'firstPerson';
  target?: [number, number, number];
}

export interface ZoneColor {
  showroom: string;
  market: string;
  warehouse: string;
}

export const ZONE_COLORS: ZoneColor = {
  showroom: '#0051BA', // IKEA Blue
  market: '#009A44', // Green
  warehouse: '#FF9900', // Orange
};

export const IKEA_YELLOW = '#FFDB00';
export const IKEA_BLUE = '#0051BA';
