export const config = { runtime: 'edge' }

const ENDPOINTS = {
  m4a: 'https://api.narakeet.com/text-to-speech/m4a',
  mp3: 'https://api.narakeet.com/text-to-speech/mp3',
  wav: 'https://api.narakeet.com/text-to-speech/wav',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) })
  }

  let body
  try {
    body = await req.json()
  } catch (err) {
    return jsonError("Noto'g'ri JSON", 400, req)
  }

  const text = (body?.text || '').trim()
  if (!text) {
    return jsonError('Matn topilmadi', 400, req)
  }

  const apiKey = process.env.NARAKEET_API_KEY || 'd9oq53OreB7PVhOTzX2zV9sNALxL2HrwJ4AvwzK0'
  if (!apiKey) {
    return jsonError('Narakeet API kaliti topilmadi', 500, req)
  }

  const format = normalizeFormat(body?.format)
  const endpoint = ENDPOINTS[format] || ENDPOINTS.m4a

  const params = new URLSearchParams()
  const voice = (body?.voice || 'gulnora').trim()
  if (voice) params.set('voice', voice)

  const voiceSpeed = (body?.voiceSpeed || '').trim()
  if (voiceSpeed) params.set('voice-speed', voiceSpeed)

  const voiceVolume = (body?.voiceVolume || '').trim()
  if (voiceVolume) params.set('voice-volume', voiceVolume)

  const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint

  const narakeetResp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      accept: 'application/octet-stream',
      'x-api-key': apiKey,
    },
    body: text,
  })

  if (!narakeetResp.ok) {
    const message = await narakeetResp.text().catch(() => '')
    const detail = message?.trim() ? `: ${message.trim()}` : ''
    return jsonError(`Narakeet xatosi ${narakeetResp.status}${detail}`, narakeetResp.status, req)
  }

  const buffer = await narakeetResp.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  const durationHeader = narakeetResp.headers.get('x-duration-seconds')
  const duration = durationHeader ? Number(durationHeader) : undefined
  const contentType = narakeetResp.headers.get('content-type') || `audio/${format}`

  const response = {
    base64,
    duration: Number.isFinite(duration) ? duration : undefined,
    contentType,
  }

  const headers = corsHeaders(req)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(response), { status: 200, headers })
}

function normalizeFormat(value) {
  const v = (value || '').toLowerCase()
  if (v === 'mp3') return 'mp3'
  if (v === 'wav') return 'wav'
  return 'm4a'
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

function jsonError(message, status, req) {
  const headers = corsHeaders(req)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '*'
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  })
}

