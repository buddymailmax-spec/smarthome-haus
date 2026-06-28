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
        </div>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 lg:flex-row">
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

        {/* Side panel */}
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-visible lg:w-80 lg:overflow-y-auto">
          <Inspector />
          <DaikinPanel />
        </aside>
      </div>

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
