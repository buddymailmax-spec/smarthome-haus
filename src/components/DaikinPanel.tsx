import { useHouse } from '../state/houseStore'

export function DaikinPanel() {
  const { daikin } = useHouse()

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Daikin</h2>
        <StatusBadge configured={daikin.configured} connected={daikin.connected} />
      </div>

      {daikin.connected ? (
        <div className="mt-3 text-sm text-slate-300">
          <p>
            {daikin.units.length} {daikin.units.length === 1 ? 'Anlage' : 'Anlagen'} gefunden. Wähle eine Klimaanlage im
            Haus und ordne sie unter „Daikin-Gerät" zu.
          </p>
        </div>
      ) : daikin.configured ? (
        <div className="mt-3">
          <p className="text-sm text-slate-400">Noch nicht verbunden. Melde dich einmalig bei Daikin an.</p>
          <a
            href="/api/daikin/auth/login"
            className="mt-3 inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#0b1020] transition hover:brightness-110"
          >
            Mit Daikin verbinden
          </a>
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-400">
          <p>Backend nicht erreichbar oder Credentials fehlen.</p>
          <p className="mt-1 text-[12px] leading-relaxed">
            Lege <code className="rounded bg-[var(--color-panel-2)] px-1">server/.env</code> an (siehe{' '}
            <code className="rounded bg-[var(--color-panel-2)] px-1">.env.example</code>) und starte das Backend mit{' '}
            <code className="rounded bg-[var(--color-panel-2)] px-1">npm run server</code>.
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ configured, connected }: { configured: boolean; connected: boolean }) {
  const { label, color } = connected
    ? { label: 'verbunden', color: 'var(--color-mint)' }
    : configured
      ? { label: 'bereit', color: 'var(--color-accent-warm)' }
      : { label: 'offline', color: '#64748b' }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
