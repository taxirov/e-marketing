export const config = { runtime: 'nodejs' };

const ALLOWED_HOSTS = new Set([
  '46.173.26.14:3000',
  '46.173.26.14',
  'e-content.webpack.uz',
  'e-content.webpack.uz:443',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end('Method Not Allowed');

  try {
    const fullUrl = new URL(req.url, 'http://local');
    const target = fullUrl.searchParams.get('url') || fullUrl.searchParams.get('u');
    if (!target) return res.status(400).end('Missing url');
    const t = new URL(target);
    if (!(t.protocol === 'http:' || t.protocol === 'https:')) return res.status(400).end('Invalid protocol');
    const hostKey = t.port ? `${t.hostname}:${t.port}` : t.hostname;
    if (!ALLOWED_HOSTS.has(hostKey)) return res.status(403).end('Host not allowed');

    const forwardHeaders = {};
    const range = req.headers['range'];
    if (range) forwardHeaders['Range'] = range;

    const upstream = await fetch(t.toString(), { method: req.method, headers: forwardHeaders });

    // Forward status and selected headers
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const acceptRanges = upstream.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    const lastMod = upstream.headers.get('last-modified');
    if (lastMod) res.setHeader('Last-Modified', lastMod);
    const etag = upstream.headers.get('etag');
    if (etag) res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=0');

    if (req.method === 'HEAD') return res.end();

    if (!upstream.body) return res.end();
    // Stream body to client
    const reader = upstream.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('proxy error:', err);
    return res.status(500).end('Proxy error');
  }
}
