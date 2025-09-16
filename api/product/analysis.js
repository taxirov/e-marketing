export const config = { runtime: 'edge' }

const TARGET = 'https://api.uy-joy.uz'

export default async function handler(req) {
  const url = new URL(req.url)
  const targetUrl = new URL(url.pathname, TARGET) // preserves /api/product/analysis

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const init = {
    method: req.method,
    headers: new Headers(req.headers),
    body: req.body,
    redirect: 'manual',
  }

  // Adjust origin-related headers so upstream doesn’t reject
  init.headers.set('origin', TARGET)
  init.headers.set('host', new URL(TARGET).host)

  const resp = await fetch(targetUrl.toString(), init)
  const resHeaders = new Headers(resp.headers)
  const body = await resp.arrayBuffer()

  // CORS for browser if ever called cross-origin (usually same-origin)
  const ch = corsHeaders(req)
  ch.forEach((v, k) => resHeaders.set(k, v))

  return new Response(body, { status: resp.status, headers: resHeaders })
}

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '*'
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  })
}

