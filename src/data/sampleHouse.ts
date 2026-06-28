import type { House } from '../types'

// Three-storey house. Footprint 9 × 6 m, shared across floors.
//   level 0 — Erdgeschoss (Wohnen, Küche)            — keine Klimaanlage
//   level 1 — Obergeschoss (Schlafen, Kind, Büro)    — 3 Klimaanlagen
//   level 2 — Dachboden                              — 1 Klimaanlage
export const sampleHouse: House = {
  id: 'house-1',
  name: 'Mein Zuhause',
  rooms: [
    // Erdgeschoss
    { id: 'eg-wohnen', name: 'Wohnzimmer', level: 0, x: 0, z: 0, width: 5.5, depth: 6, height: 2.8, color: '#7fb2f0' },
    { id: 'eg-kueche', name: 'Küche', level: 0, x: 5.5, z: 0, width: 3.5, depth: 6, height: 2.8, color: '#5cc6b3' },
    // Obergeschoss
    { id: 'og-schlafen', name: 'Schlafzimmer', level: 1, x: 0, z: 0, width: 3, depth: 6, height: 2.8, color: '#9b8cf0' },
    { id: 'og-kind', name: 'Kinderzimmer', level: 1, x: 3, z: 0, width: 3, depth: 6, height: 2.8, color: '#f0a85c' },
    { id: 'og-buero', name: 'Büro', level: 1, x: 6, z: 0, width: 3, depth: 6, height: 2.8, color: '#5ca8f0' },
    // Dachboden
    { id: 'dg-dach', name: 'Dachboden', level: 2, x: 1.5, z: 0.5, width: 6, depth: 5, height: 2.4, color: '#8fa4bd' },
  ],
  devices: [
    {
      id: 'ac-schlafen',
      roomId: 'og-schlafen',
      name: 'Daikin Schlafzimmer',
      kind: 'climate',
      pos: { x: 0.5, z: 0.08 },
      binding: { adapter: 'mock', unitId: 'bed' },
      state: { power: true, mode: 'cool', target: 21, current: 23.4, fan: 0 },
    },
    {
      id: 'ac-kind',
      roomId: 'og-kind',
      name: 'Daikin Kinderzimmer',
      kind: 'climate',
      pos: { x: 0.5, z: 0.08 },
      binding: { adapter: 'mock', unitId: 'kid' },
      state: { power: false, mode: 'heat', target: 20, current: 19.6, fan: 2 },
    },
    {
      id: 'ac-buero',
      roomId: 'og-buero',
      name: 'Daikin Büro',
      kind: 'climate',
      pos: { x: 0.5, z: 0.08 },
      binding: { adapter: 'mock', unitId: 'office' },
      state: { power: true, mode: 'auto', target: 23, current: 23.1, fan: 0 },
    },
    {
      id: 'ac-dach',
      roomId: 'dg-dach',
      name: 'Daikin Dachboden',
      kind: 'climate',
      pos: { x: 0.5, z: 0.1 },
      binding: { adapter: 'mock', unitId: 'attic' },
      state: { power: true, mode: 'cool', target: 24, current: 26.2, fan: 1 },
    },
  ],
}
