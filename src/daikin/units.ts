import type { ClimateDevice } from '../types'

export interface UnitOption {
  unitId: string
  name: string
}

/**
 * Unit options for the Daikin dropdown. Always includes the currently bound
 * unit — even if the live list hasn't (re)loaded (e.g. a rate-limited refresh) —
 * so a bound anlage never disappears and the device doesn't falsely fall back
 * to "Mock".
 */
export function mergeUnitOptions(units: UnitOption[], binding: ClimateDevice['binding']): UnitOption[] {
  if (binding?.adapter !== 'onecta' || !binding.unitId) return units
  if (units.some((u) => u.unitId === binding.unitId)) return units
  return [{ unitId: binding.unitId, name: binding.name ?? 'Zugewiesenes Gerät' }, ...units]
}
