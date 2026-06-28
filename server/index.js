// Smart-Home backend: holds the Daikin Onecta OAuth tokens (so secrets never
// reach the browser) and proxies climate read/command calls.
//
// Config via server/.env (see .env.example):
//   DAIKIN_CLIENT_ID, DAIKIN_CLIENT_SECRET, DAIKIN_REDIRECT_URI, PORT
//
// Flow: open /api/daikin/auth/login in a browser -> log in at Daikin ->
// redirected to /api/daikin/auth/callback -> tokens stored -> API live.

import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import {
  buildAuthorizeUrl,
  exchangeCode,
  refreshToken,
  getDevices,
  patchCharacteristic,
  toReading,
  commandToPatches,
} from './onecta.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load server/.env regardless of the current working directory (npm run server
// launches from the project root, so a bare dotenv/config would miss it).
dotenv.config({ path: path.join(__dirname, '.env') })
const TOKEN_FILE = path.join(__dirname, '.tokens.json')

const CLIENT_ID = process.env.DAIKIN_CLIENT_ID
const CLIENT_SECRET = process.env.DAIKIN_CLIENT_SECRET
const REDIRECT_URI = process.env.DAIKIN_REDIRECT_URI || 'http://localhost:3001/api/daikin/auth/callback'
const PORT = Number(process.env.PORT) || 3001

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('⚠️  DAIKIN_CLIENT_ID / DAIKIN_CLIENT_SECRET fehlen — lege server/.env an (siehe .env.example).')
}

// --- Token store (file-backed; survives restarts, lost on container redeploy) ---
let tokens = null // { access_token, refresh_token, expires_at }
try {
  if (fs.existsSync(TOKEN_FILE)) tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
} catch (e) {
  console.warn('Token-Datei nicht lesbar:', e.message)
}
function saveTokens(t) {
  tokens = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens), 'utf8')
}

async function accessToken() {
  if (!tokens) throw new Error('not_connected')
  if (Date.now() < tokens.expires_at) return tokens.access_token
  const refreshed = await refreshToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: tokens.refresh_token })
  saveTokens(refreshed)
  return tokens.access_token
}

// --- Device cache (respect Onecta rate limits) ---
let cache = { at: 0, devices: [] }
const CACHE_TTL = 30_000
async function devices(force = false) {
  if (!force && Date.now() - cache.at < CACHE_TTL && cache.devices.length) return cache.devices
  const token = await accessToken()
  const list = await getDevices(token)
  cache = { at: Date.now(), devices: Array.isArray(list) ? list : [] }
  return cache.devices
}

const app = express()
app.use(express.json())

// --- OAuth ---
const states = new Set()

app.get('/api/daikin/auth/login', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex')
  states.add(state)
  res.redirect(buildAuthorizeUrl(CLIENT_ID, REDIRECT_URI, state))
})

app.get('/api/daikin/auth/callback', async (req, res) => {
  const { code, state, error } = req.query
  if (error) return res.status(400).send(`Daikin-Fehler: ${error}`)
  if (!state || !states.has(String(state))) return res.status(400).send('Ungültiger state.')
  states.delete(String(state))
  try {
    const t = await exchangeCode({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, code: String(code), redirectUri: REDIRECT_URI })
    saveTokens(t)
    res.send('<h2>✅ Daikin verbunden.</h2><p>Du kannst dieses Fenster schließen und zur App zurückkehren.</p>')
  } catch (e) {
    res.status(500).send(`Token-Austausch fehlgeschlagen: ${e.message}`)
  }
})

app.get('/api/daikin/auth/status', (_req, res) => {
  res.json({ connected: !!tokens, configured: !!(CLIENT_ID && CLIENT_SECRET) })
})

// --- Climate API (matches src/daikin/adapter.ts OnectaAdapter) ---
app.get('/api/daikin/units', async (_req, res) => {
  try {
    const list = await devices()
    const units = list.map(toReading).filter(Boolean).map((u) => ({ unitId: u.unitId, name: u.name }))
    res.json(units)
  } catch (e) {
    res.status(e.message === 'not_connected' ? 401 : 500).json({ error: e.message })
  }
})

app.get('/api/daikin/:unitId', async (req, res) => {
  try {
    const list = await devices()
    const dev = list.find((d) => d.id === req.params.unitId)
    if (!dev) return res.status(404).json({ error: 'unit_not_found' })
    const mapped = toReading(dev)
    if (!mapped) return res.status(422).json({ error: 'not_a_climate_unit' })
    res.json(mapped.reading)
  } catch (e) {
    res.status(e.message === 'not_connected' ? 401 : 500).json({ error: e.message })
  }
})

app.post('/api/daikin/:unitId', async (req, res) => {
  try {
    const token = await accessToken()
    const list = await devices()
    const dev = list.find((d) => d.id === req.params.unitId)
    if (!dev) return res.status(404).json({ error: 'unit_not_found' })

    const patches = commandToPatches(dev, req.body || {})
    for (const p of patches) {
      await patchCharacteristic(token, dev.id, p.embeddedId, p.dataPoint, p.value, p.path)
    }
    // Force a fresh read so the response reflects the new state.
    const fresh = (await devices(true)).find((d) => d.id === req.params.unitId)
    res.json(toReading(fresh).reading)
  } catch (e) {
    res.status(e.message === 'not_connected' ? 401 : 500).json({ error: e.message })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`🏠 Smart-Home backend auf http://localhost:${PORT}`))
