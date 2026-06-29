import type { ClimateMode } from '../types'
import { isClimate } from '../types'
import { useHouse } from '../state/houseStore'
import { mergeUnitOptions } from '../daikin/units'
import { LEVEL_NAMES } from '../scene/constants'

const MODES: { id: ClimateMode; label: string; icon: string }[] = [
  { id: 'cool', label: 'Kühlen', icon: '❄️' },
  { id: 'heat', label: 'Heizen', icon: '🔥' },
  { id: 'dry', label: 'Entf.', icon: '💧' },
  { id: 'fan', label: 'Lüften', icon: '🌀' },
  { id: 'auto', label: 'Auto', icon: '✨' },
]

const inputCls =
  'w-full rounded-lg bg-[var(--color-sky-2)] px-3 py-1.5 text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]'

export function Inspector({ embedded = false }: { embedded?: boolean } = {}) {
  const { house, selectedId, view, daikin, applyClimate, bindDevice, assignDeviceRoom, renameDevice, toggleSimple, updateRoom, removeRoom } = useHouse()

  // Inside the settings modal we drop the translucent "glass" look (meant for
  // floating over the 3D scene) for a clean, solid card.
  const wrap = embedded ? 'rounded-2xl border border-[var(--color-line)] bg-[var(--color-sky-2)] p-5' : 'glass rounded-2xl p-5'

  const device = house.devices.find((d) => d.id === selectedId)
  const room = house.rooms.find((r) => r.id === selectedId)

  if (!device && !room) {
    return (
      <div className={`${wrap} text-sm text-[var(--color-muted)]`}>
        <p className="font-medium text-[var(--color-ink)]">Nichts ausgewählt</p>
        <p className="mt-1 leading-relaxed">Klick auf einen Raum im Haus, um ihn zu bearbeiten.</p>
      </div>
    )
  }

  // --- Climate device controls ---
  if (device && isClimate(device)) {
    const s = device.state
    return (
      <div className={wrap}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">{device.name}</h2>
            <p className="text-xs text-[var(--color-muted)]">Klimaanlage · {s.current.toFixed(1)}° aktuell</p>
          </div>
          <button
            onClick={() => applyClimate(device.id, { power: !s.power })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              s.power ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-sky-2)] text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'
            }`}
          >
            {s.power ? 'An' : 'Aus'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white/65 p-3 ring-1 ring-[var(--color-line)]">
          <Field label="Name">
            <input value={device.name} onChange={(e) => renameDevice(device.id, e.target.value)} className={inputCls} />
          </Field>
          <Field label="Raum">
            <select value={device.roomId} onChange={(e) => assignDeviceRoom(device.id, e.target.value)} className={inputCls}>
              {house.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Target temperature */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            onClick={() => applyClimate(device.id, { target: Math.max(16, s.target - 0.5) })}
            className="h-10 w-10 rounded-full bg-[var(--color-sky-2)] text-xl leading-none text-[var(--color-ink)] ring-1 ring-[var(--color-line)] hover:bg-white"
          >
            −
          </button>
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums text-[var(--color-ink)]">{s.target.toFixed(1)}°</div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Ziel</div>
          </div>
          <button
            onClick={() => applyClimate(device.id, { target: Math.min(30, s.target + 0.5) })}
            className="h-10 w-10 rounded-full bg-[var(--color-sky-2)] text-xl leading-none text-[var(--color-ink)] ring-1 ring-[var(--color-line)] hover:bg-white"
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
                s.mode === m.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-sky-2)] text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'
              }`}
            >
              <span className="text-base">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Fan */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-[var(--color-muted)]">
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
        <div className="mt-4 rounded-lg bg-[var(--color-sky-2)] px-3 py-2.5 ring-1 ring-[var(--color-line)]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Daikin-Gerät</span>
            {device.binding?.adapter === 'onecta' ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-mint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mint)]" />
                {daikin.busy === device.id ? 'sendet…' : 'live'}
              </span>
            ) : (
              <span className="text-[11px] text-[var(--color-muted)]">Mock</span>
            )}
          </div>
          {daikin.connected || device.binding?.adapter === 'onecta' ? (
            <select
              value={device.binding?.adapter === 'onecta' ? device.binding.unitId : ''}
              onChange={(e) => bindDevice(device.id, e.target.value || null)}
              className="w-full rounded-md bg-white px-2.5 py-1.5 text-sm text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-line)] focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">— Mock (nicht verbunden) —</option>
              {mergeUnitOptions(daikin.units, device.binding).map((u) => (
                <option key={u.unitId} value={u.unitId}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
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
      <div className={wrap}>
        <h2 className="text-base font-semibold text-[var(--color-ink)]">{device.name}</h2>
        <p className="text-xs capitalize text-[var(--color-muted)]">{device.kind}</p>
        {device.kind === 'sensor' ? (
          <div className="mt-4 text-3xl font-bold tabular-nums text-[var(--color-ink)]">
            {device.state.value}
            {device.state.unit}
          </div>
        ) : (
          <button
            onClick={() => toggleSimple(device.id)}
            className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
              on ? 'bg-[var(--color-mint)] text-white' : 'bg-[var(--color-sky-2)] text-[var(--color-muted)] ring-1 ring-[var(--color-line)]'
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
      <div className={wrap}>
        <h2 className="text-base font-semibold text-[var(--color-ink)]">{room.name}</h2>
        <p className="text-xs text-[var(--color-muted)]">
          {LEVEL_NAMES[room.level] ?? `Ebene ${room.level}`} · {(room.width * room.depth).toFixed(1)} m²
        </p>

        {view === 'edit' ? (
          <div className="mt-4 space-y-3 text-sm">
            <Field label="Name">
              <input value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Etage">
              <select
                value={room.level}
                onChange={(e) => updateRoom(room.id, { level: Number(e.target.value) })}
                className={inputCls}
              >
                {LEVEL_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
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
                className="h-9 w-full cursor-pointer rounded-lg bg-transparent ring-1 ring-[var(--color-line)]"
              />
            </Field>
            <button
              onClick={() => removeRoom(room.id)}
              className="w-full rounded-lg bg-[var(--color-warm)]/12 py-2 text-sm font-medium text-[var(--color-warm)] hover:bg-[var(--color-warm)]/20"
            >
              Raum löschen
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Wechsle in den <span className="font-medium text-[var(--color-ink)]">Bearbeiten</span>-Modus, um diesen Raum zu ändern.
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
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</span>
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
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />
    </Field>
  )
}
