import { create } from 'zustand'
import type { ClimateMode, Device, House, Room } from '../types'
import { isClimate } from '../types'
import { sampleHouse } from '../data/sampleHouse'

type ViewMode = 'view' | 'edit'

interface HouseState {
  house: House
  selectedId: string | null
  view: ViewMode
  hovered: string | null

  setView: (v: ViewMode) => void
  select: (id: string | null) => void
  setHovered: (id: string | null) => void

  // Room editing
  addRoom: () => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  removeRoom: (id: string) => void

  // Device control
  setClimate: (deviceId: string, patch: Partial<{ power: boolean; mode: ClimateMode; target: number; fan: number }>) => void
  toggleSimple: (deviceId: string) => void
}

let roomCounter = 100

export const useHouse = create<HouseState>((set) => ({
  house: sampleHouse,
  selectedId: null,
  view: 'view',
  hovered: null,

  setView: (v) => set({ view: v }),
  select: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hovered: id }),

  addRoom: () =>
    set((s) => {
      const id = `r-new-${roomCounter++}`
      const newRoom: Room = {
        id,
        name: 'Neuer Raum',
        x: 0,
        z: -5,
        width: 4,
        depth: 4,
        height: 2.7,
        color: '#5b8cff',
      }
      return { house: { ...s.house, rooms: [...s.house.rooms, newRoom] }, selectedId: id }
    }),

  updateRoom: (id, patch) =>
    set((s) => ({
      house: {
        ...s.house,
        rooms: s.house.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),

  removeRoom: (id) =>
    set((s) => ({
      house: {
        ...s.house,
        rooms: s.house.rooms.filter((r) => r.id !== id),
        devices: s.house.devices.filter((d) => d.roomId !== id),
      },
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  setClimate: (deviceId, patch) =>
    set((s) => ({
      house: {
        ...s.house,
        devices: s.house.devices.map((d): Device => {
          if (d.id !== deviceId || !isClimate(d)) return d
          return { ...d, state: { ...d.state, ...patch } }
        }),
      },
    })),

  toggleSimple: (deviceId) =>
    set((s) => ({
      house: {
        ...s.house,
        devices: s.house.devices.map((d): Device => {
          if (d.id !== deviceId || isClimate(d)) return d
          return { ...d, state: { ...d.state, on: !d.state.on } }
        }),
      },
    })),
}))
