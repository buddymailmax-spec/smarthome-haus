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
npm install            # Frontend-Deps
npm run dev            # Frontend (Vite) auf :5173

cd server && npm install   # Backend-Deps
cp .env.example .env       # Onecta-Credentials eintragen
cd .. && npm run server    # Backend auf :3001 (hält die Daikin-Tokens)
```
Ohne Backend/Credentials läuft die App im **Mock-Modus** (Beispielhaus, simulierte Geräte).

## Daikin scharf schalten (echte Steuerung)
1. `server/.env` mit `DAIKIN_CLIENT_ID` / `DAIKIN_CLIENT_SECRET` füllen.
2. Im [Daikin Developer Portal](https://developer.cloud.daikineurope.com/) als **Redirect URI** exakt
   `http://localhost:3001/api/daikin/auth/callback` (Dev) bzw. die Produktions-URL eintragen.
3. Backend starten, in der App **„Mit Daikin verbinden"** klicken, bei Daikin einloggen.
4. Klimaanlage im Haus anklicken → unter **„Daikin-Gerät"** dem echten Onecta-Gerät zuordnen.

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
