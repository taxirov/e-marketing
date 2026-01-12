export const config = { runtime: 'nodejs' };

const TARGET = 'https://avto-video2.webpack.uz';
const ALLOWED_FORWARD_HEADERS = ['authorization', 'content-type', 'accept'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end('Method Not Allowed');

  try {
    const url = new URL(req.url, 'http://local');
    const id = url.pathname.split('/').pop();
    const targetUrl = new URL(`/api/audio/text/${id || ''}`, TARGET);

    const headers = {};
    for (const key of ALLOWED_FORWARD_HEADERS) {
      const value = req.headers[key];
      if (value) headers[key] = value;
    }
    if (!headers.accept) headers.accept = 'application/json';

    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      redirect: 'manual',
    });

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    const ab = await upstream.arrayBuffer();
    res.end(Buffer.from(ab));
  } catch (err) {
    console.error('backend proxy error:', err);
    res.status(500).end('Proxy error');
  }
}
