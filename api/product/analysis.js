export const config = { runtime: 'edge' }

const TARGET = 'https://api.uy-joy.uz'
const ALLOWED_FORWARD_HEADERS = ['authorization', 'content-type', 'accept']

export default async function handler(req) {
  const url = new URL(req.url)
  const targetUrl = new URL(url.pathname + url.search, TARGET)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const headers = new Headers()
  for (const key of ALLOWED_FORWARD_HEADERS) {
    const value = req.headers.get(key)
    if (value) headers.set(key, value)
  }
  if (!headers.has('accept')) headers.set('accept', 'application/json')

  let body
  if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
    body = await req.arrayBuffer()
  }

  const upstream = await fetch(targetUrl.toString(), {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  })

  const resHeaders = new Headers(upstream.headers)
  const cors = corsHeaders(req)
  cors.forEach((value, key) => resHeaders.set(key, value))

  return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
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
