import type { ClimateMode } from '../types'
import { isClimate } from '../types'
import { useHouse } from '../state/houseStore'

const MODES: { id: ClimateMode; label: string; icon: string }[] = [
  { id: 'cool', label: 'Kühlen', icon: '❄️' },
  { id: 'heat', label: 'Heizen', icon: '🔥' },
  { id: 'dry', label: 'Entf.', icon: '💧' },
  { id: 'fan', label: 'Lüften', icon: '🌀' },
  { id: 'auto', label: 'Auto', icon: '✨' },
]

export function Inspector() {
  const { house, selectedId, view, daikin, applyClimate, bindDevice, toggleSimple, updateRoom, removeRoom } = useHouse()

  const device = house.devices.find((d) => d.id === selectedId)
  const room = house.rooms.find((r) => r.id === selectedId)

  if (!device && !room) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-slate-400">
        <p className="font-medium text-slate-200">Nichts ausgewählt</p>
        <p className="mt-1 leading-relaxed">
          Klick auf einen Raum oder ein leuchtendes Gerät im Haus, um es zu steuern.
        </p>
      </div>
    )
  }

  // --- Climate device controls ---
  if (device && isClimate(device)) {
    const s = device.state
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{device.name}</h2>
            <p className="text-xs text-slate-400">Klimaanlage · {s.current.toFixed(1)}° aktuell</p>
          </div>
          <button
            onClick={() => applyClimate(device.id, { power: !s.power })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              s.power ? 'bg-[var(--color-accent)] text-[#0b1020]' : 'bg-[var(--color-panel-2)] text-slate-400'
            }`}
          >
            {s.power ? 'An' : 'Aus'}
          </button>
        </div>

        {/* Target temperature dial */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            onClick={() => applyClimate(device.id, { target: Math.max(16, s.target - 0.5) })}
            className="h-10 w-10 rounded-full bg-[var(--color-panel-2)] text-xl leading-none hover:bg-[var(--color-line)]"
          >
            −
          </button>
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums">{s.target.toFixed(1)}°</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Ziel</div>
          </div>
          <button
            onClick={() => applyClimate(device.id, { target: Math.min(30, s.target + 0.5) })}
            className="h-10 w-10 rounded-full bg-[var(--color-panel-2)] text-xl leading-none hover:bg-[var(--color-line)]"
          >
            +
          </button>
        </div>

        {/* Mode selector */}
        <div className="mt-5 grid grid-cols-5 gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => applyClimate(device.id, { mode: m.id })}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition ${
                s.mode === m.id ? 'bg-[var(--color-accent)] text-[#0b1020]' : 'bg-[var(--color-panel-2)] text-slate-300'
              }`}
            >
              <span className="text-base">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Fan */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
            <span>Lüfter</span>
            <span>{s.fan === 0 ? 'Auto' : `Stufe ${s.fan}`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={s.fan}
            onChange={(e) => applyClimate(device.id, { fan: Number(e.target.value) })}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>

        {/* Daikin binding */}
        <div className="mt-4 rounded-lg bg-[var(--color-panel-2)] px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Daikin-Gerät</span>
            {device.binding?.adapter === 'onecta' ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-mint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mint)]" />
                {daikin.busy === device.id ? 'sendet…' : 'live'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Mock</span>
            )}
          </div>
          {daikin.connected ? (
            <select
              value={device.binding?.adapter === 'onecta' ? device.binding.unitId : ''}
              onChange={(e) => bindDevice(device.id, e.target.value || null)}
              className="w-full rounded-md bg-[var(--color-panel)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="">— Mock (nicht verbunden) —</option>
              {daikin.units.map((u) => (
                <option key={u.unitId} value={u.unitId}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] leading-relaxed text-slate-400">
              Mock-Modus. Verbinde Daikin unten, um diese Anlage einem echten Gerät zuzuordnen.
            </p>
          )}
        </div>
      </div>
    )
  }

  // --- Simple device (light / sensor / plug) ---
  if (device) {
    const on = !!device.state.on
    return (
      <div className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold">{device.name}</h2>
        <p className="text-xs capitalize text-slate-400">{device.kind}</p>
        {device.kind === 'sensor' ? (
          <div className="mt-4 text-3xl font-bold tabular-nums">
            {device.state.value}
            {device.state.unit}
          </div>
        ) : (
          <button
            onClick={() => toggleSimple(device.id)}
            className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
              on ? 'bg-[var(--color-mint)] text-[#0b1020]' : 'bg-[var(--color-panel-2)] text-slate-400'
            }`}
          >
            {on ? 'Eingeschaltet' : 'Ausgeschaltet'}
          </button>
        )}
      </div>
    )
  }

  // --- Room editor ---
  if (room) {
    return (
      <div className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold">{room.name}</h2>
        <p className="text-xs text-slate-400">Raum · {(room.width * room.depth).toFixed(1)} m²</p>

        {view === 'edit' ? (
          <div className="mt-4 space-y-3 text-sm">
            <Field label="Name">
              <input
                value={room.name}
                onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                className="w-full rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Breite (m)" value={room.width} onChange={(v) => updateRoom(room.id, { width: v })} />
              <NumField label="Tiefe (m)" value={room.depth} onChange={(v) => updateRoom(room.id, { depth: v })} />
              <NumField label="Position X" value={room.x} onChange={(v) => updateRoom(room.id, { x: v })} step={0.5} />
              <NumField label="Position Z" value={room.z} onChange={(v) => updateRoom(room.id, { z: v })} step={0.5} />
            </div>
            <Field label="Farbe">
              <input
                type="color"
                value={room.color}
                onChange={(e) => updateRoom(room.id, { color: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg bg-transparent"
              />
            </Field>
            <button
              onClick={() => removeRoom(room.id)}
              className="w-full rounded-lg bg-[var(--color-accent-warm)]/15 py-2 text-sm font-medium text-[var(--color-accent-warm)] hover:bg-[var(--color-accent-warm)]/25"
            >
              Raum löschen
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Wechsle in den <span className="text-slate-200">Bearbeiten</span>-Modus, um diesen Raum zu ändern.
          </p>
        )}
      </div>
    )
  }

  return null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function NumField({
  label,
  value,
  onChange,
  step = 0.5,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      />
    </Field>
  )
}
