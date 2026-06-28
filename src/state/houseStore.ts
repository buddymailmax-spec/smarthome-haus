import { create } from 'zustand'
import type { ClimateMode, Device, House, Room } from '../types'
import { isClimate } from '../types'
import { sampleHouse } from '../data/sampleHouse'
import { getAdapter, type ClimateCommand } from '../daikin/adapter'

type ViewMode = 'view' | 'edit'

interface DaikinStatus {
  configured: boolean
  connected: boolean
  units: { unitId: string; name: string }[]
  busy: string | null // deviceId currently sending a command
}

interface HouseState {
  house: House
  selectedId: string | null
  view: ViewMode
  hovered: string | null
  daikin: DaikinStatus

  setView: (v: ViewMode) => void
  select: (id: string | null) => void
  setHovered: (id: string | null) => void

  // Room editing
  addRoom: () => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  removeRoom: (id: string) => void

  // Climate control — routes through the bound adapter (mock or onecta)
  applyClimate: (deviceId: string, cmd: ClimateCommand) => Promise<void>
  toggleSimple: (deviceId: string) => void

  // Daikin connection + binding
  refreshDaikinStatus: () => Promise<void>
  bindDevice: (deviceId: string, unitId: string | null) => void
  syncClimate: (deviceId: string) => Promise<void>
}

let roomCounter = 100

type ClimateStatePatch = Partial<{ power: boolean; mode: ClimateMode; target: number; current: number; fan: number }>

// Local-only patch of a climate device's state (used for optimistic UI + polling).
function patchLocal(s: HouseState, deviceId: string, patch: ClimateStatePatch): House {
  return {
    ...s.house,
    devices: s.house.devices.map((d): Device => {
      if (d.id !== deviceId || !isClimate(d)) return d
      return { ...d, state: { ...d.state, ...patch } }
    }),
  }
}

export const useHouse = create<HouseState>((set, get) => ({
  house: sampleHouse,
  selectedId: null,
  view: 'view',
  hovered: null,
  daikin: { configured: false, connected: false, units: [], busy: null },

  setView: (v) => set({ view: v }),
  select: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hovered: id }),

  addRoom: () =>
    set((s) => {
      const id = `r-new-${roomCounter++}`
      // New rooms land on the ground floor by default; change the storey in the editor.
      const newRoom: Room = { id, name: 'Neuer Raum', level: 0, x: 0, z: -5, width: 4, depth: 4, height: 2.8, color: '#7fb2f0' }
      return { house: { ...s.house, rooms: [...s.house.rooms, newRoom] }, selectedId: id }
    }),

  updateRoom: (id, patch) =>
    set((s) => ({
      house: { ...s.house, rooms: s.house.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
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

  applyClimate: async (deviceId, cmd) => {
    const device = get().house.devices.find((d) => d.id === deviceId)
    if (!device || !isClimate(device)) return

    // Optimistic update so the UI reacts instantly.
    set((s) => ({ house: patchLocal(s, deviceId, cmd) }))

    const adapter = getAdapter(device.binding?.adapter)
    const unitId = device.binding?.unitId
    if (!unitId) return // unbound -> mock/optimistic only

    set((s) => ({ daikin: { ...s.daikin, busy: deviceId } }))
    try {
      const reading = await adapter.command(unitId, cmd)
      set((s) => ({ house: patchLocal(s, deviceId, reading), daikin: { ...s.daikin, busy: null } }))
    } catch (e) {
      console.error('Climate command failed:', e)
      set((s) => ({ daikin: { ...s.daikin, busy: null } }))
    }
  },

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

  refreshDaikinStatus: async () => {
    try {
      const r = await fetch('/api/daikin/auth/status')
      if (!r.ok) return
      const status = await r.json()
      let units: { unitId: string; name: string }[] = []
      if (status.connected) {
        const ru = await fetch('/api/daikin/units')
        if (ru.ok) units = await ru.json()
      }
      set((s) => ({ daikin: { ...s.daikin, configured: !!status.configured, connected: !!status.connected, units } }))
    } catch {
      // backend not running -> stay in mock mode silently
    }
  },

  bindDevice: (deviceId, unitId) =>
    set((s) => ({
      house: {
        ...s.house,
        devices: s.house.devices.map((d): Device => {
          if (d.id !== deviceId || !isClimate(d)) return d
          return { ...d, binding: unitId ? { adapter: 'onecta', unitId } : { adapter: 'mock', unitId: d.id } }
        }),
      },
    })),

  syncClimate: async (deviceId) => {
    const device = get().house.devices.find((d) => d.id === deviceId)
    if (!device || !isClimate(device) || device.binding?.adapter !== 'onecta' || !device.binding.unitId) return
    try {
      const reading = await getAdapter('onecta').read(device.binding.unitId)
      set((s) => ({ house: patchLocal(s, deviceId, reading) }))
    } catch (e) {
      console.error('Climate sync failed:', e)
    }
  },
}))
