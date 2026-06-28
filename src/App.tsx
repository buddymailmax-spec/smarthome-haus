import { House3D } from './scene/House3D'
import { Inspector } from './components/Inspector'
import { DaikinPanel } from './components/DaikinPanel'
import { useHouse } from './state/houseStore'
import { useDaikinSync } from './daikin/useDaikinSync'
import type { ClimateDevice, ClimateMode } from './types'
import { isClimate } from './types'
import { useState } from 'react'

const MODES: { id: ClimateMode; label: string }[] = [
  { id: 'cool', label: 'Kühlen' },
  { id: 'heat', label: 'Heizen' },
  { id: 'dry', label: 'Entfeuchten' },
  { id: 'fan', label: 'Lüften' },
  { id: 'auto', label: 'Auto' },
]

export default function App() {
  const { house, selectedId, view, setView, addRoom, select, applyClimate } = useHouse()
  const [revealInterior, setRevealInterior] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useDaikinSync()

  const climates = house.devices.filter(isClimate)
  const selectedClimate = climates.find((c) => c.id === selectedId) ?? null
  const selectedRoom = selectedClimate ? house.rooms.find((r) => r.id === selectedClimate.roomId) ?? null : null
  const activeClimates = climates.filter((c) => c.state.power).length
  const avgTemp =
    climates.length > 0
      ? (climates.reduce((sum, c) => sum + c.state.current, 0) / climates.length).toFixed(1)
      : '–'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent)] text-white shadow-sm">
            <HomeIcon />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-[var(--color-ink)]">{house.name}</h1>
            <p className="text-xs text-[var(--color-muted)]">
              {house.rooms.length} Räume · {climates.length} Klimaanlagen
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Stat label="Ø Temperatur" value={`${avgTemp}°`} />
          <Stat label="Aktiv" value={`${activeClimates}/${climates.length}`} />
          <div className="ml-2 flex rounded-xl bg-white/70 p-1 shadow-sm ring-1 ring-[var(--color-line)]">
            <Seg active={view === 'view'} onClick={() => setView('view')}>
              Ansicht
            </Seg>
            <Seg active={view === 'edit'} onClick={() => setView('edit')}>
              Bearbeiten
            </Seg>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="ml-1 grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-[var(--color-ink)] shadow-sm ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5 hover:bg-white"
            aria-label="Einstellungen öffnen"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 px-4 pb-4">
        {/* 3D stage */}
        <main className="glass relative min-h-[520px] min-w-0 flex-1 overflow-hidden rounded-3xl sm:min-h-[620px] lg:min-h-0">
          <House3D revealInterior={revealInterior} />
          <div className="absolute left-5 top-5 flex rounded-2xl bg-white/78 p-1 shadow-lg shadow-slate-700/10 ring-1 ring-[var(--color-line)] backdrop-blur">
            <Seg active={!revealInterior} onClick={() => setRevealInterior(false)}>
              Außen
            </Seg>
            <Seg active={revealInterior} onClick={() => setRevealInterior(true)}>
              Innenansicht
            </Seg>
          </div>
          {view === 'edit' && (
            <button
              onClick={addRoom}
              className="absolute bottom-5 left-5 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/30 transition hover:brightness-105"
            >
              + Raum hinzufügen
            </button>
          )}
          {view === 'view' && (
            <div className="pointer-events-none absolute bottom-5 right-5 rounded-lg bg-white/70 px-3 py-1.5 text-[11px] text-[var(--color-muted)] backdrop-blur">
              Ziehen zum Drehen · Scrollen zum Zoomen
            </div>
          )}
        </main>

      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {selectedClimate && (
        <ClimateControlModal
          device={selectedClimate}
          roomName={selectedRoom?.name ?? 'Kein Raum'}
          onClose={() => select(null)}
          onCommand={(cmd) => applyClimate(selectedClimate.id, cmd)}
        />
      )}
    </div>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const house = useHouse((s) => s.house)
  const climates = house.devices.filter(isClimate)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,42,58,0.42)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-pop flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[var(--color-line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-7 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">System</p>
            <h2 className="mt-0.5 text-2xl font-semibold text-[var(--color-ink)]">Einstellungen</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-sky-2)] text-2xl leading-none text-[var(--color-muted)] ring-1 ring-[var(--color-line)] transition hover:text-[var(--color-ink)]"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-7 lg:grid-cols-[1.55fr_1fr]">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Klimaanlagen</h3>
              <span className="text-xs text-[var(--color-muted)]">{climates.length} Geräte</span>
            </div>
            <div className="space-y-3">
              {climates.length === 0 ? (
                <p className="rounded-2xl bg-[var(--color-sky-2)] p-4 text-sm text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                  Keine Klimaanlagen vorhanden.
                </p>
              ) : (
                climates.map((d) => <ClimateCard key={d.id} device={d} />)
              )}
            </div>
          </section>

          <section className="space-y-5">
            <DaikinPanel embedded />
            <Inspector embedded />
          </section>
        </div>
      </div>
    </div>
  )
}

/** Self-contained climate card for the settings list: works in mock mode too. */
function ClimateCard({ device }: { device: ClimateDevice }) {
  const { house, daikin, renameDevice, assignDeviceRoom, bindDevice, applyClimate } = useHouse()
  const s = device.state
  const room = house.rooms.find((r) => r.id === device.roomId)
  const live = device.binding?.adapter === 'onecta'
  const fieldCls =
    'w-full rounded-lg bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]'

  return (
    <div className="rounded-2xl bg-[var(--color-sky-2)] p-4 ring-1 ring-[var(--color-line)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--color-ink)]">{device.name}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {room?.name ?? 'Kein Raum'} · {s.current.toFixed(1)}° aktuell ·{' '}
            <span className={live ? 'text-[var(--color-mint)]' : ''}>{live ? 'Live verbunden' : 'Mock'}</span>
          </p>
        </div>
        <button
          onClick={() => applyClimate(device.id, { power: !s.power })}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            s.power ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'
          }`}
        >
          {s.power ? 'An' : 'Aus'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => applyClimate(device.id, { target: Math.max(16, s.target - 0.5) })}
            className="h-9 w-9 rounded-full bg-white text-xl leading-none text-[var(--color-ink)] ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5"
          >
            −
          </button>
          <div className="min-w-16 text-center">
            <div className="text-2xl font-bold tabular-nums text-[var(--color-ink)]">{s.target.toFixed(1)}°</div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Ziel</div>
          </div>
          <button
            onClick={() => applyClimate(device.id, { target: Math.min(30, s.target + 0.5) })}
            className="h-9 w-9 rounded-full bg-white text-xl leading-none text-[var(--color-ink)] ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5"
          >
            +
          </button>
        </div>
        <div className="grid flex-1 grid-cols-5 gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => applyClimate(device.id, { mode: m.id })}
              className={`rounded-lg py-1.5 text-[10px] font-semibold transition ${
                s.mode === m.id ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Name</span>
          <input value={device.name} onChange={(e) => renameDevice(device.id, e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Raum</span>
          <select value={device.roomId} onChange={(e) => assignDeviceRoom(device.id, e.target.value)} className={fieldCls}>
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
            value={live ? device.binding!.unitId : ''}
            onChange={(e) => bindDevice(device.id, e.target.value || null)}
            disabled={!daikin.connected}
            className={`${fieldCls} disabled:opacity-60`}
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
}

function ClimateControlModal({
  device,
  roomName,
  onClose,
  onCommand,
}: {
  device: ClimateDevice
  roomName: string
  onClose: () => void
  onCommand: (cmd: { power?: boolean; mode?: ClimateMode; target?: number; fan?: number }) => void
}) {
  const s = device.state
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,42,58,0.34)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-pop w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-[var(--color-line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{roomName}</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{device.name}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{s.current.toFixed(1)}° aktuell</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-sky-2)] text-xl leading-none text-[var(--color-muted)] ring-1 ring-[var(--color-line)] transition hover:text-[var(--color-ink)]"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--color-sky-2)] p-4 text-center ring-1 ring-[var(--color-line)]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Zieltemperatur</div>
          <div className="mt-2 flex items-center justify-center gap-5">
            <button
              onClick={() => onCommand({ target: Math.max(16, s.target - 0.5) })}
              className="h-11 w-11 rounded-full bg-white text-2xl leading-none text-[var(--color-ink)] shadow-sm ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5"
            >
              -
            </button>
            <div className="min-w-28 text-4xl font-bold tabular-nums text-[var(--color-ink)]">{s.target.toFixed(1)}°</div>
            <button
              onClick={() => onCommand({ target: Math.min(30, s.target + 0.5) })}
              className="h-11 w-11 rounded-full bg-white text-2xl leading-none text-[var(--color-ink)] shadow-sm ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onCommand({ mode: mode.id })}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                s.mode === mode.id
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'bg-[var(--color-sky-2)] text-[var(--color-muted)] ring-1 ring-[var(--color-line)] hover:bg-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-[var(--color-muted)]">
            <span>Lüfter</span>
            <span>{s.fan === 0 ? 'Auto' : `Stufe ${s.fan}`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={s.fan}
            onChange={(e) => onCommand({ fan: Number(e.target.value) })}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>

        <button
          onClick={() => onCommand({ power: !s.power })}
          className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 ${
            s.power ? 'bg-[var(--color-warm)] shadow-[var(--color-warm)]/20' : 'bg-[var(--color-accent)] shadow-[var(--color-accent)]/20'
          }`}
        >
          {s.power ? 'Ausschalten' : 'Einschalten'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-3.5 py-1.5 text-right">
      <div className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
    </div>
  )
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
      }`}
    >
      {children}
    </button>
  )
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.09H2.9a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 4.6 8.62a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.1 2.1 0 1 1 7.17 3.63l.04.04a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.09-1.65V2.3a2.1 2.1 0 0 1 4.2 0v.06a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  )
}
