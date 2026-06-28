// Pluggable Daikin control layer.
//
// The UI never talks to a specific backend directly — it goes through this
// interface. That lets us swap between:
//   - 'mock'   : in-memory, for development / demo (active now)
//   - 'onecta' : Daikin cloud API, works from Hetzner (needs dev credentials)
//   - 'local'  : local HTTP API on the BRP WiFi adapter (needs LAN access)
//
// To go live we implement OnectaAdapter against our backend proxy and switch
// the binding on each climate device from 'mock' to 'onecta'.

import type { ClimateMode } from '../types'

export interface ClimateReading {
  power: boolean
  mode: ClimateMode
  target: number
  current: number
  fan: number
}

export interface ClimateCommand {
  power?: boolean
  mode?: ClimateMode
  target?: number
  fan?: number
}

export interface DaikinAdapter {
  readonly id: string
  listUnits(): Promise<{ unitId: string; name: string }[]>
  read(unitId: string): Promise<ClimateReading>
  command(unitId: string, cmd: ClimateCommand): Promise<ClimateReading>
}

/** In-memory mock so the whole app works before real credentials exist. */
export class MockAdapter implements DaikinAdapter {
  readonly id = 'mock'
  private units = new Map<string, ClimateReading>([
    ['living', { power: true, mode: 'cool', target: 22, current: 24.5, fan: 0 }],
    ['bed', { power: false, mode: 'heat', target: 20, current: 19.2, fan: 2 }],
    ['office', { power: true, mode: 'auto', target: 23, current: 23.1, fan: 0 }],
  ])

  async listUnits() {
    return [
      { unitId: 'living', name: 'Daikin Wohnzimmer' },
      { unitId: 'bed', name: 'Daikin Schlafzimmer' },
      { unitId: 'office', name: 'Daikin Büro' },
    ]
  }

  async read(unitId: string): Promise<ClimateReading> {
    return this.units.get(unitId) ?? { power: false, mode: 'auto', target: 21, current: 21, fan: 0 }
  }

  async command(unitId: string, cmd: ClimateCommand): Promise<ClimateReading> {
    const cur = await this.read(unitId)
    const next = { ...cur, ...cmd }
    this.units.set(unitId, next)
    // Simulate the room slowly drifting toward target when powered on.
    return next
  }
}

/**
 * Daikin Onecta cloud adapter — talks to OUR backend (server/), which holds the
 * OAuth tokens and proxies to Daikin so secrets never reach the browser.
 *
 * Endpoints expected on the backend (to be implemented in server/index.js):
 *   GET  /api/daikin/units
 *   GET  /api/daikin/:unitId
 *   POST /api/daikin/:unitId   body: ClimateCommand
 */
export class OnectaAdapter implements DaikinAdapter {
  readonly id = 'onecta'
  constructor(private baseUrl = '/api/daikin') {}

  async listUnits() {
    const r = await fetch(`${this.baseUrl}/units`)
    if (!r.ok) throw new Error(`Onecta units ${r.status}`)
    return r.json()
  }

  async read(unitId: string): Promise<ClimateReading> {
    const r = await fetch(`${this.baseUrl}/${encodeURIComponent(unitId)}`)
    if (!r.ok) throw new Error(`Onecta read ${r.status}`)
    return r.json()
  }

  async command(unitId: string, cmd: ClimateCommand): Promise<ClimateReading> {
    const r = await fetch(`${this.baseUrl}/${encodeURIComponent(unitId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cmd),
    })
    if (!r.ok) throw new Error(`Onecta command ${r.status}`)
    return r.json()
  }
}

const adapters: Record<string, DaikinAdapter> = {
  mock: new MockAdapter(),
  onecta: new OnectaAdapter(),
}

export function getAdapter(kind: string | undefined): DaikinAdapter {
  return adapters[kind ?? 'mock'] ?? adapters.mock
}
