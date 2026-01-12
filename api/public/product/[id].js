export const config = { runtime: 'edge' }

const TARGET = 'https://api.uy-joy.uz'

export default async function handler(req) {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()
  const targetUrl = new URL(`/api/public/product/${id || ''}`, TARGET)
  targetUrl.search = url.search

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const headers = new Headers()
  if (!headers.has('accept')) headers.set('accept', 'application/json')

  const upstream = await fetch(targetUrl.toString(), {
    method: req.method,
    headers,
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
