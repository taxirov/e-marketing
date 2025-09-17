export const config = { runtime: 'edge' }

const API_URL = 'https://matn.uz/api/v1/latin'

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

  const token = process.env.MATN_API_TOKEN || "vmTYSQIIyB8kUDAaNy33Asu4jjnQ5qXbsJcIehi7SOmoUmhvmdogxsTlKmM8c6W46AFweVlvflEs0VdK"
  if (!token) {
    return jsonError('Matn API token topilmadi', 500, req)
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    const detail = message?.trim() ? `: ${message.trim()}` : ''
    return jsonError(`Matn.uz xatosi ${res.status}${detail}`, res.status, req)
  }

  const latin = (await res.text()).replace('\u2018', "ʻ")
  const headers = corsHeaders(req)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify({ text: latin }), { status: 200, headers })
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
