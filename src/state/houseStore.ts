import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ClimateMode, Device, House, Room } from '../types'
import { isClimate } from '../types'
import { sampleHouse } from '../data/sampleHouse'
import { getAdapter, type ClimateCommand, type ClimateReading } from '../daikin/adapter'

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
  assignDeviceRoom: (deviceId: string, roomId: string) => void
  renameDevice: (deviceId: string, name: string) => void

  // Climate control — routes through the bound adapter (mock or onecta)
  applyClimate: (deviceId: string, cmd: ClimateCommand) => Promise<void>
  toggleSimple: (deviceId: string) => void

  // Daikin connection + binding
  refreshDaikinStatus: () => Promise<void>
  bindDevice: (deviceId: string, unitId: string | null) => void
  syncClimate: (deviceId: string) => Promise<void>
  /** Re-read a bound unit a few times after a command so the UI converges to the real state. */
  scheduleResync: (deviceId: string) => void
}

let roomCounter = 100

type ClimateStatePatch = Partial<{ power: boolean; mode: ClimateMode; target: number; current: number; fan: number }>
type PersistedHouseState = Partial<Pick<HouseState, 'house' | 'view'>>

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

function normalizeHouse(house: House): House {
  return {
    ...house,
    rooms: house.rooms.map((r) => (r.id === 'dg-dach' ? { ...r, x: 0, z: 0, width: 9, depth: 6 } : r)),
  }
}

// Recently sent commands, kept until the device's own reading confirms them.
// Without this, an eventually-consistent Daikin read taken seconds after a
// command can report the old value and flicker the UI back.
const pendingCommands = new Map<string, { cmd: ClimateCommand; until: number }>()

function rememberCommand(deviceId: string, cmd: ClimateCommand) {
  const prev = pendingCommands.get(deviceId)?.cmd ?? {}
  pendingCommands.set(deviceId, { cmd: { ...prev, ...cmd }, until: Date.now() + 35_000 })
}

// Merge a fresh reading with any still-unconfirmed command: keep the commanded
// fields until the device actually reports them, take everything else (e.g.
// current temperature) straight from the reading.
function reconcile(deviceId: string, reading: ClimateReading): ClimateStatePatch {
  const pending = pendingCommands.get(deviceId)
  if (!pending) return reading
  if (Date.now() >= pending.until) {
    pendingCommands.delete(deviceId)
    return reading
  }
  const merged: ClimateStatePatch = { ...reading }
  let allConfirmed = true
  for (const key of Object.keys(pending.cmd) as (keyof ClimateCommand)[]) {
    const want = pending.cmd[key]
    if (want === undefined) continue
    if (reading[key] === want) continue // device now reports our value
    ;(merged as Record<string, unknown>)[key] = want // not applied yet -> keep intent
    allConfirmed = false
  }
  if (allConfirmed) pendingCommands.delete(deviceId)
  return merged
}

export const useHouse = create<HouseState>()(
  persist(
    (set, get) => ({
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

      assignDeviceRoom: (deviceId, roomId) =>
        set((s) => ({
          house: {
            ...s.house,
            devices: s.house.devices.map((d): Device => (d.id === deviceId ? { ...d, roomId } : d)),
          },
        })),

      renameDevice: (deviceId, name) =>
        set((s) => ({
          house: {
            ...s.house,
            devices: s.house.devices.map((d): Device => (d.id === deviceId ? { ...d, name } : d)),
          },
        })),

      applyClimate: async (deviceId, cmd) => {
        const device = get().house.devices.find((d) => d.id === deviceId)
        if (!device || !isClimate(device)) return

        // Optimistic update so the UI reacts instantly.
        set((s) => ({ house: patchLocal(s, deviceId, cmd) }))

        const adapter = getAdapter(device.binding?.adapter)
        const unitId = device.binding?.unitId
        if (!unitId) return // unbound -> mock/optimistic only

        const isOnecta = device.binding?.adapter === 'onecta'
        if (isOnecta) rememberCommand(deviceId, cmd)

        set((s) => ({ daikin: { ...s.daikin, busy: deviceId } }))
        try {
          const reading = await adapter.command(unitId, cmd)
          // Daikin's cloud is eventually consistent: a read right after a
          // command can still report the OLD state. Trust the command we just
          // sent for the fields we changed; take the rest (e.g. current temp)
          // from the reading.
          set((s) => ({ house: patchLocal(s, deviceId, { ...reading, ...cmd }), daikin: { ...s.daikin, busy: null } }))
          // Then re-read a few times so the UI converges to the real settled state.
          if (isOnecta) get().scheduleResync(deviceId)
        } catch (e) {
          console.error('Climate command failed:', e)
          set((s) => ({ daikin: { ...s.daikin, busy: null } }))
        }
      },

      scheduleResync: (deviceId) => {
        // Spread out so we catch the device once Daikin has applied the change,
        // without hammering the rate-limited API.
        for (const delay of [5000, 12000, 25000]) {
          setTimeout(() => { get().syncClimate(deviceId) }, delay)
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
          // Keep the units we already have: a transient failure (Daikin rate
          // limits are tight) must NOT wipe the list and make the user's
          // bound anlagen disappear from the dropdown.
          let units = get().daikin.units
          if (status.connected) {
            try {
              const ru = await fetch('/api/daikin/units')
              if (ru.ok) {
                const data = await ru.json()
                if (Array.isArray(data) && data.length) units = data
              }
              // non-ok / empty -> keep previously loaded units
            } catch {
              // keep previously loaded units
            }
          } else {
            units = [] // genuinely disconnected
          }
          set((s) => ({ daikin: { ...s.daikin, configured: !!status.configured, connected: !!status.connected, units } }))
        } catch {
          // backend not running -> stay in mock mode silently
        }
      },

      bindDevice: (deviceId, unitId) =>
        set((s) => {
          // Remember the unit's display name so the dropdown can still show it
          // even when the live unit list hasn't (re)loaded.
          const name = s.daikin.units.find((u) => u.unitId === unitId)?.name
          return {
            house: {
              ...s.house,
              devices: s.house.devices.map((d): Device => {
                if (d.id !== deviceId || !isClimate(d)) return d
                return { ...d, binding: unitId ? { adapter: 'onecta', unitId, name } : { adapter: 'mock', unitId: d.id } }
              }),
            },
          }
        }),

      syncClimate: async (deviceId) => {
        const device = get().house.devices.find((d) => d.id === deviceId)
        if (!device || !isClimate(device) || device.binding?.adapter !== 'onecta' || !device.binding.unitId) return
        try {
          const reading = await getAdapter('onecta').read(device.binding.unitId)
          set((s) => ({ house: patchLocal(s, deviceId, reconcile(deviceId, reading)) }))
        } catch (e) {
          console.error('Climate sync failed:', e)
        }
      },
    }),
    {
      name: 'smarthome-haus-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ house: s.house, view: s.view }),
      version: 2,
      migrate: (persisted) => {
        const state = persisted as PersistedHouseState
        if (!state.house) return persisted
        return { ...state, house: normalizeHouse(state.house) }
      },
    },
  ),
)

// --- Cross-device sync ------------------------------------------------------
// The house config (rooms, devices, names, bindings, AC settings) is the shared
// source of truth on the backend, not per-browser localStorage. Each device
// pulls it on start (and on window focus) and pushes its own edits back, so you
// set things up once and every device picks it up. localStorage stays as a
// fast offline cache; the server always wins when it has data.
const HOUSE_URL = '/api/house'
let applyingRemote = false
let lastSynced = ''
let pushTimer: ReturnType<typeof setTimeout> | null = null

async function pullHouse() {
  try {
    const r = await fetch(HOUSE_URL)
    if (!r.ok) return
    const doc = await r.json()
    if (!doc || !Array.isArray(doc.rooms) || !Array.isArray(doc.devices)) return
    const { updatedAt: _u, ...house } = doc
    const body = JSON.stringify(house)
    if (body === lastSynced) return // already in sync, nothing to apply
    applyingRemote = true
    useHouse.setState({ house: normalizeHouse(house as House) })
    lastSynced = body
    applyingRemote = false
  } catch {
    // backend not running -> local/mock mode, no sync
  }
}

function schedulePush(house: House) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    const body = JSON.stringify(house)
    if (body === lastSynced) return
    try {
      const r = await fetch(HOUSE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (r.ok) lastSynced = body
    } catch {
      // offline -> keep the localStorage copy; retry on next change
    }
  }, 600)
}

if (typeof window !== 'undefined') {
  pullHouse()
  useHouse.subscribe((state, prev) => {
    if (applyingRemote || state.house === prev.house) return
    schedulePush(state.house)
  })
  // Pick up edits made on other devices when this tab regains focus.
  window.addEventListener('focus', () => pullHouse())
}
