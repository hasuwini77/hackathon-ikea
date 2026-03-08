export interface StoreZone {
  id: string;
  name: string;
  startAisle: number;
  endAisle: number;
  color: string;        // Tailwind class
  bgColor: string;      // Background color
}

export interface StoreLayout {
  id: string;
  name: string;
  zones: StoreZone[];
  totalAisles: number;  // 30
  baysPerAisle: number; // 10
  sections: string[];   // ['A', 'B', 'C', 'D']
}

export interface MapLocation {
  aisle: number;
  bay: number;
  section: string;
}

export interface MapState {
  zoom: number;          // 0.5 - 2.0
  highlightedLocation: MapLocation | null;
  selectedAisle: number | null;
}
