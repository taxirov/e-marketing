export const config = { runtime: 'nodejs' };

const TARGET = 'https://avto-video2.webpack.uz';
const ALLOWED_FORWARD_HEADERS = ['authorization', 'content-type', 'accept'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const url = new URL(req.url, 'http://local');
    const targetUrl = new URL('/api/generate/audio', TARGET);
    targetUrl.search = url.search;

    const headers = {};
    for (const key of ALLOWED_FORWARD_HEADERS) {
      const value = req.headers[key];
      if (value) headers[key] = value;
    }
    if (!headers.accept) headers.accept = 'application/json';

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
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
