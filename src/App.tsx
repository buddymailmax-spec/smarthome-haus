import { House3D } from './scene/House3D'
import { Inspector } from './components/Inspector'
import { DaikinPanel } from './components/DaikinPanel'
import { useHouse } from './state/houseStore'
import { useDaikinSync } from './daikin/useDaikinSync'
import { isClimate } from './types'
import { useState } from 'react'

export default function App() {
  const { house, view, setView, addRoom } = useHouse()
  const [revealInterior, setRevealInterior] = useState(false)
  useDaikinSync()

  const climates = house.devices.filter(isClimate)
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
