import { House3D } from './scene/House3D'
import { Inspector } from './components/Inspector'
import { DaikinPanel } from './components/DaikinPanel'
import { useHouse } from './state/houseStore'
import { useDaikinSync } from './daikin/useDaikinSync'
import { isClimate } from './types'

export default function App() {
  const { house, view, setView, addRoom } = useHouse()
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
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent)] text-[#0b1020]">
            <HomeIcon />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">{house.name}</h1>
            <p className="text-xs text-slate-400">
              {house.rooms.length} Räume · {climates.length} Klimaanlagen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Stat label="Ø Temperatur" value={`${avgTemp}°`} />
          <Stat label="Aktiv" value={`${activeClimates}/${climates.length}`} />
          <div className="ml-2 flex rounded-xl bg-[var(--color-panel-2)] p-1">
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
      <div className="relative flex min-h-0 flex-1 gap-4 px-4 pb-4">
        {/* 3D stage */}
        <main className="glass relative min-w-0 flex-1 overflow-hidden rounded-3xl">
          <House3D />
          {view === 'edit' && (
            <button
              onClick={addRoom}
              className="absolute bottom-5 left-5 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[#0b1020] shadow-lg shadow-[var(--color-accent)]/30 transition hover:brightness-110"
            >
              + Raum hinzufügen
            </button>
          )}
          {view === 'view' && (
            <div className="pointer-events-none absolute bottom-5 right-5 rounded-lg bg-[var(--color-panel)]/70 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur">
              Ziehen zum Drehen · Scrollen zum Zoomen
            </div>
          )}
        </main>

        {/* Side panel */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
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
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-[var(--color-accent)] text-[#0b1020]' : 'text-slate-400 hover:text-slate-200'
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
