# Deployment auf Hetzner (Coolify)

Ein einziger Container: das Express-Backend liefert die API **und** das gebaute
Frontend aus. Dadurch eine Domain, kein CORS, und die OAuth-Redirect-URI ist
einfach `https://<deine-domain>/api/daikin/auth/callback`.

## 1. Code auf GitHub
```bash
cd smarthome-haus
git remote add origin git@github.com:<dein-user>/smarthome-haus.git
git push -u origin main
```

## 2. In Coolify ein Resource anlegen
- **New Resource → Application → Public/Private Repository**, das Repo auswählen.
- **Build Pack: Dockerfile** (das Dockerfile im Repo-Root wird genutzt).
- **Port: 3001** (exposed Port des Containers).
- Auto-Deploy on push aktivieren (wie bei deinem bestehenden Setup).

## 3. Domain + HTTPS
- Im Resource eine **Domain** setzen, z. B. `smarthome.deinedomain.de`.
- Coolify holt automatisch ein Let's-Encrypt-Zertifikat → HTTPS steht.

## 4. Environment-Variablen (im Coolify-Resource)
| Variable | Wert |
|---|---|
| `DAIKIN_CLIENT_ID` | deine Client-ID |
| `DAIKIN_CLIENT_SECRET` | dein Secret |
| `DAIKIN_REDIRECT_URI` | `https://smarthome.deinedomain.de/api/daikin/auth/callback` |

`PORT` (3001) und `DATA_DIR` (/app/data) setzt das Dockerfile bereits.

## 5. Persistentes Volume für die Tokens
- **Storage → Persistent Storage** hinzufügen, gemountet auf **`/app/data`**.
- Dort liegt `.tokens.json` → die Daikin-Verbindung überlebt Redeploys.
  *(Später optional: Token-Store auf Supabase umstellen.)*

## 6. Deploy klicken
Coolify baut das Image und startet den Container. Logs sollten zeigen:
```
📦 Frontend wird aus dist/ ausgeliefert
🏠 Smart-Home backend auf http://localhost:3001
```

## 7. Redirect-URI im Daikin-Portal eintragen
Jetzt, wo die URL **öffentlich + HTTPS** ist, akzeptiert das Portal den
„registration hook":
- Im [Daikin Developer Portal](https://developer.cloud.daikineurope.com/) bei der App
  als **Redirect URI** exakt `https://smarthome.deinedomain.de/api/daikin/auth/callback`
  eintragen und speichern (kein 403 mehr).

## 8. Verbinden
- `https://smarthome.deinedomain.de` öffnen → **„Mit Daikin verbinden"** → einloggen.
- Status springt auf **verbunden**, danach jede Klimaanlage einem echten Gerät zuordnen.
