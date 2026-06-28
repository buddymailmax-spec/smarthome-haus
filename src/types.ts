// Core domain model for the smart-home house.

export type DeviceKind = 'climate' | 'light' | 'sensor' | 'plug'

export type ClimateMode = 'cool' | 'heat' | 'fan' | 'dry' | 'auto'

export interface DeviceBase {
  id: string
  roomId: string
  name: string
  kind: DeviceKind
  /** Position inside the room, normalized 0..1 on the room footprint (x, z). */
  pos: { x: number; z: number }
}

export interface ClimateDevice extends DeviceBase {
  kind: 'climate'
  /** Daikin adapter binding — which backend + unit this maps to. */
  binding?: { adapter: 'mock' | 'onecta' | 'local'; unitId: string }
  state: {
    power: boolean
    mode: ClimateMode
    /** Target temperature in °C. */
    target: number
    /** Current measured room temperature in °C. */
    current: number
    /** Fan level 0..5 (0 = auto). */
    fan: number
  }
}

export interface SimpleDevice extends DeviceBase {
  kind: 'light' | 'sensor' | 'plug'
  state: { on?: boolean; value?: number; unit?: string }
}

export type Device = ClimateDevice | SimpleDevice

export interface Room {
  id: string
  name: string
  /** Footprint rectangle in meters, top-down plan coordinates. */
  x: number
  z: number
  width: number
  depth: number
  /** Wall height in meters. */
  height: number
  /** Accent color for the room floor/label. */
  color: string
}

export interface House {
  id: string
  name: string
  rooms: Room[]
  devices: Device[]
}

export function isClimate(d: Device): d is ClimateDevice {
  return d.kind === 'climate'
}
