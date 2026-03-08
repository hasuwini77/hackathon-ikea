import type { StoreLayout } from './types';

export const STORE_LAYOUT: StoreLayout = {
  id: 'ikea-store-1',
  name: 'IKEA Warehouse',
  totalAisles: 30,
  baysPerAisle: 10,
  sections: ['A', 'B', 'C', 'D'],
  zones: [
    { id: 'showroom', name: 'Showroom', startAisle: 1, endAisle: 10, color: 'blue', bgColor: 'bg-blue-100' },
    { id: 'market', name: 'Market Hall', startAisle: 11, endAisle: 20, color: 'green', bgColor: 'bg-green-100' },
    { id: 'warehouse', name: 'Warehouse', startAisle: 21, endAisle: 30, color: 'orange', bgColor: 'bg-orange-100' },
  ]
};
