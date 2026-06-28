// Daikin Onecta cloud API client + value mapping.
//
// Endpoints (verified against the daikin_onecta HA integration):
//   authorize: https://idp.onecta.daikineurope.com/v1/oidc/authorize
//   token:     https://idp.onecta.daikineurope.com/v1/oidc/token
//   base API:  https://api.onecta.daikineurope.com
//   devices:   GET  /v1/gateway-devices
//   command:   PATCH /v1/gateway-devices/{id}/management-points/{embeddedId}/characteristics/{dataPoint}
//              body: { value, path? }
//
// Onecta is heavily rate-limited (a few hundred calls/day), so the device list
// is cached and polling should stay gentle.

export const IDP = 'https://idp.onecta.daikineurope.com/v1/oidc'
export const API = 'https://api.onecta.daikineurope.com'
export const SCOPE = 'openid onecta:basic.integration'

// our ClimateMode <-> Onecta operationMode
const MODE_TO_ONECTA = { cool: 'cooling', heat: 'heating', dry: 'dry', fan: 'fanOnly', auto: 'auto' }
const ONECTA_TO_MODE = { cooling: 'cool', heating: 'heat', dry: 'dry', fanOnly: 'fan', auto: 'auto' }

export function buildAuthorizeUrl(clientId, redirectUri, state) {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  })
  return `${IDP}/authorize?${p.toString()}`
}

export async function exchangeCode({ clientId, clientSecret, code, redirectUri }) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })
}

export async function refreshToken({ clientId, clientSecret, refreshToken }) {
  return tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })
}

async function tokenRequest(params) {
  const r = await fetch(`${IDP}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`Onecta token ${r.status}: ${text}`)
  return JSON.parse(text)
}

export async function getDevices(accessToken) {
  const r = await fetch(`${API}/v1/gateway-devices`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) throw new Error(`Onecta devices ${r.status}: ${await r.text()}`)
  return r.json()
}

/** PATCH a single characteristic on a management point. */
export async function patchCharacteristic(accessToken, deviceId, embeddedId, dataPoint, value, path) {
  const body = path !== undefined ? { value, path } : { value }
  const r = await fetch(
    `${API}/v1/gateway-devices/${encodeURIComponent(deviceId)}/management-points/${encodeURIComponent(
      embeddedId,
    )}/characteristics/${encodeURIComponent(dataPoint)}`,
    {
      method: 'PATCH',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  // Onecta returns 204 No Content on success.
  if (!r.ok) throw new Error(`Onecta patch ${dataPoint} ${r.status}: ${await r.text()}`)
}

// --- Mapping between Onecta device JSON and our flat ClimateReading ---

function findClimatePoint(device) {
  return (device.managementPoints || []).find(
    (mp) => mp.managementPointType === 'climateControl' || mp.embeddedId === 'climateControl',
  )
}

function deviceName(device, mp) {
  return mp?.name?.value || device.deviceModel || device.id
}

/** Turn a raw Onecta device into our flat reading. Returns null if not a climate unit. */
export function toReading(device) {
  const mp = findClimatePoint(device)
  if (!mp) return null

  const onMode = mp.operationMode?.value
  const mode = ONECTA_TO_MODE[onMode] ?? 'auto'
  const power = mp.onOffMode?.value === 'on'

  // Target setpoint lives under temperatureControl for the current operation mode.
  const setpoints = mp.temperatureControl?.value?.operationModes?.[onMode]?.setpoints
  const target = setpoints?.roomTemperature?.value ?? setpoints?.leavingWaterTemperature?.value ?? 21

  // Current measured temp from sensoryData.
  const current = mp.sensoryData?.value?.roomTemperature?.value ?? target

  // Fan: 0 = auto, otherwise fixed level.
  const fanMode = mp.fanControl?.value?.operationModes?.[onMode]?.fanSpeed?.currentMode?.value
  const fanFixed = mp.fanControl?.value?.operationModes?.[onMode]?.fanSpeed?.modes?.fixed?.value
  const fan = fanMode === 'fixed' ? Number(fanFixed) || 1 : 0

  return {
    unitId: device.id,
    name: deviceName(device, mp),
    embeddedId: mp.embeddedId,
    onectaMode: onMode,
    reading: { power, mode, target, current, fan },
  }
}

/** Translate one of our commands into the sequence of Onecta PATCH calls needed. */
export function commandToPatches(device, cmd) {
  const mp = findClimatePoint(device)
  if (!mp) throw new Error('Gerät hat keinen climateControl-Punkt')
  const embeddedId = mp.embeddedId
  // The operation mode the setpoint/fan paths must target.
  const targetMode = cmd.mode ? MODE_TO_ONECTA[cmd.mode] : mp.operationMode?.value
  const patches = []

  if (cmd.power !== undefined) {
    patches.push({ embeddedId, dataPoint: 'onOffMode', value: cmd.power ? 'on' : 'off' })
  }
  if (cmd.mode !== undefined) {
    patches.push({ embeddedId, dataPoint: 'operationMode', value: MODE_TO_ONECTA[cmd.mode] })
  }
  if (cmd.target !== undefined) {
    patches.push({
      embeddedId,
      dataPoint: 'temperatureControl',
      value: cmd.target,
      path: `/operationModes/${targetMode}/setpoints/roomTemperature`,
    })
  }
  if (cmd.fan !== undefined) {
    if (cmd.fan === 0) {
      patches.push({
        embeddedId,
        dataPoint: 'fanControl',
        value: 'auto',
        path: `/operationModes/${targetMode}/fanSpeed/currentMode`,
      })
    } else {
      patches.push({
        embeddedId,
        dataPoint: 'fanControl',
        value: 'fixed',
        path: `/operationModes/${targetMode}/fanSpeed/currentMode`,
      })
      patches.push({
        embeddedId,
        dataPoint: 'fanControl',
        value: cmd.fan,
        path: `/operationModes/${targetMode}/fanSpeed/modes/fixed`,
      })
    }
  }
  return patches
}
