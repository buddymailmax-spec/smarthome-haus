import type { House } from '../types'

// A small starter house so the 3D view and editor have something to show
// before the user builds their own rooms. Coordinates are in meters.
export const sampleHouse: House = {
  id: 'house-1',
  name: 'Mein Zuhause',
  rooms: [
    { id: 'r-living', name: 'Wohnzimmer', x: 0, z: 0, width: 6, depth: 5, height: 2.7, color: '#5b8cff' },
    { id: 'r-kitchen', name: 'Küche', x: 6, z: 0, width: 4, depth: 5, height: 2.7, color: '#4fd1c5' },
    { id: 'r-bed', name: 'Schlafzimmer', x: 0, z: 5, width: 5, depth: 4, height: 2.7, color: '#b78cff' },
    { id: 'r-bath', name: 'Bad', x: 5, z: 5, width: 3, depth: 4, height: 2.7, color: '#ff8a5b' },
    { id: 'r-office', name: 'Büro', x: 8, z: 5, width: 2, depth: 4, height: 2.7, color: '#ffd25b' },
  ],
  devices: [
    {
      id: 'd-ac-living',
      roomId: 'r-living',
      name: 'Daikin Wohnzimmer',
      kind: 'climate',
      pos: { x: 0.5, z: 0.1 },
      binding: { adapter: 'mock', unitId: 'living' },
      state: { power: true, mode: 'cool', target: 22, current: 24.5, fan: 0 },
    },
    {
      id: 'd-ac-bed',
      roomId: 'r-bed',
      name: 'Daikin Schlafzimmer',
      kind: 'climate',
      pos: { x: 0.5, z: 0.1 },
      binding: { adapter: 'mock', unitId: 'bed' },
      state: { power: false, mode: 'heat', target: 20, current: 19.2, fan: 2 },
    },
    {
      id: 'd-ac-office',
      roomId: 'r-office',
      name: 'Daikin Büro',
      kind: 'climate',
      pos: { x: 0.5, z: 0.5 },
      binding: { adapter: 'mock', unitId: 'office' },
      state: { power: true, mode: 'auto', target: 23, current: 23.1, fan: 0 },
    },
    {
      id: 'd-light-living',
      roomId: 'r-living',
      name: 'Deckenlicht',
      kind: 'light',
      pos: { x: 0.5, z: 0.6 },
      state: { on: true },
    },
    {
      id: 'd-sensor-bath',
      roomId: 'r-bath',
      name: 'Feuchte',
      kind: 'sensor',
      pos: { x: 0.5, z: 0.5 },
      state: { value: 58, unit: '%' },
    },
  ],
}
