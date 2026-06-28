import { useMemo, useState } from 'react'
import { useHouse } from '../state/houseStore'
import { isClimate } from '../types'

export function DaikinPanel() {
  const { house, daikin, refreshDaikinStatus, bindDevice, assignDeviceRoom, renameDevice } = useHouse()
  const [open, setOpen] = useState(false)
  const climates = useMemo(() => house.devices.filter(isClimate), [house.devices])
  const bound = climates.filter((d) => d.binding?.adapter === 'onecta').length

  return (
    <div className="glass panel-pop rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Daikin</h2>
        <StatusBadge configured={daikin.configured} connected={daikin.connected} />
      </div>

      {daikin.connected ? (
        <div className="mt-3">
          <p className="text-sm text-[var(--color-muted)]">
            {daikin.units.length} {daikin.units.length === 1 ? 'Anlage' : 'Anlagen'} gefunden · {bound}/{climates.length} zugeordnet
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-3 w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Zuordnung öffnen
          </button>
        </div>
      ) : daikin.configured ? (
        <div className="mt-3">
          <p className="text-sm text-[var(--color-muted)]">Noch nicht verbunden. Melde dich einmalig bei Daikin an.</p>
          <a
            href="/api/daikin/auth/login"
            className="mt-3 inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Mit Daikin verbinden
          </a>
          <button
            onClick={() => refreshDaikinStatus()}
            className="ml-2 mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-line)] transition hover:bg-[var(--color-sky-2)]"
          >
            Status prüfen
          </button>
        </div>
      ) : (
        <div className="mt-3 text-sm text-[var(--color-muted)]">
          <p>Backend nicht erreichbar oder Credentials fehlen.</p>
          <p className="mt-1 text-[12px] leading-relaxed">
            Lege <code className="rounded bg-[var(--color-sky-2)] px-1">server/.env</code> an (siehe{' '}
            <code className="rounded bg-[var(--color-sky-2)] px-1">.env.example</code>) und starte das Backend mit{' '}
            <code className="rounded bg-[var(--color-sky-2)] px-1">npm run server</code>.
          </p>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,42,58,0.32)] p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="modal-pop max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-[var(--color-line)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">Klimaanlagen zuordnen</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Räume, Namen und Daikin-Geräte werden dauerhaft gespeichert.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-sky-2)] text-xl leading-none text-[var(--color-muted)] ring-1 ring-[var(--color-line)] transition hover:text-[var(--color-ink)]"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {climates.map((device) => {
                const room = house.rooms.find((r) => r.id === device.roomId)
                return (
                  <div key={device.id} className="rounded-xl bg-[var(--color-sky-2)] p-3 ring-1 ring-[var(--color-line)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{device.name}</p>
                        <p className="text-xs text-[var(--color-muted)]">{room?.name ?? 'Kein Raum'} · {device.binding?.adapter === 'onecta' ? 'live verbunden' : 'Mock'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${device.binding?.adapter === 'onecta' ? 'bg-[var(--color-mint)]/12 text-[var(--color-mint)]' : 'bg-white text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'}`}>
                        {device.binding?.adapter === 'onecta' ? 'Aktiv' : 'Demo'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block sm:col-span-1">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Name</span>
                        <input
                          value={device.name}
                          onChange={(e) => renameDevice(device.id, e.target.value)}
                          className="w-full rounded-lg bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Raum</span>
                        <select
                          value={device.roomId}
                          onChange={(e) => assignDeviceRoom(device.id, e.target.value)}
                          className="w-full rounded-lg bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          {house.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Daikin-Gerät</span>
                        <select
                          value={device.binding?.adapter === 'onecta' ? device.binding.unitId : ''}
                          onChange={(e) => bindDevice(device.id, e.target.value || null)}
                          className="w-full rounded-lg bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]"
                        >
                          <option value="">Mock / nicht verbunden</option>
                          {daikin.units.map((u) => (
                            <option key={u.unitId} value={u.unitId}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => refreshDaikinStatus()}
                className="rounded-xl bg-[var(--color-sky-2)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-line)] transition hover:bg-white"
              >
                Geräte neu laden
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ configured, connected }: { configured: boolean; connected: boolean }) {
  const { label, color } = connected
    ? { label: 'verbunden', color: 'var(--color-mint)' }
    : configured
      ? { label: 'bereit', color: 'var(--color-warm)' }
      : { label: 'offline', color: 'var(--color-muted)' }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
