# Smart Home · Haus

Ein modernes 3D-Dashboard, in dem du dein Zuhause nachbaust und deine Smart-Home-Geräte
(zuerst Daikin-Klimaanlagen) visuell steuerst.

## Stack
- **Vite + React + TypeScript**
- **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`) für die 3D-Darstellung
- **Tailwind CSS v4** für das UI
- **Zustand** für State
- **Supabase** für Cloud-Sync des Hauslayouts (optional)

## Entwicklung
```bash
npm install
npm run dev
```

## Architektur

### 3D-Haus (`src/scene/`)
Räume werden **prozedural** aus den Daten in `src/types.ts` gerendert (Grundriss in Metern),
nicht aus fertigen 3D-Modellen — so kann der Nutzer eigene Räume bauen.

### Daikin-Anbindung (`src/daikin/adapter.ts`)
Austauschbarer Adapter:
- `mock` — In-Memory, aktiv für Entwicklung/Demo
- `onecta` — Daikin Cloud-API (läuft über das Backend, funktioniert von Hetzner aus)
- `local` — lokale HTTP-API am BRP-WiFi-Adapter (nur im Heimnetz)

**Für echte Steuerung benötigt:** Daikin-Developer-Credentials vom
[Daikin Developer Portal](https://developer.cloud.daikineurope.com/). Diese kommen ins
Backend (`server/`), damit Tokens nie im Browser landen.

## Deployment
Gedacht für Hetzner + Coolify (Auto-Deploy on push), wie das bestehende Setup.
