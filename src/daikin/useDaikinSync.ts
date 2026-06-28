import { useEffect } from 'react'
import { useHouse } from '../state/houseStore'
import { isClimate } from '../types'

// Checks Daikin connection on mount and gently polls bound units for fresh
// readings. The backend caches the device list, so one poll round is cheap.
export function useDaikinSync(intervalMs = 30_000) {
  const refreshDaikinStatus = useHouse((s) => s.refreshDaikinStatus)
  const syncClimate = useHouse((s) => s.syncClimate)

  useEffect(() => {
    refreshDaikinStatus()
  }, [refreshDaikinStatus])

  useEffect(() => {
    const tick = () => {
      const { house, daikin } = useHouse.getState()
      if (!daikin.connected) return
      for (const d of house.devices) {
        if (isClimate(d) && d.binding?.adapter === 'onecta') syncClimate(d.id)
      }
    }
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [syncClimate, intervalMs])
}
